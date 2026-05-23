import { useState, useRef, useEffect } from 'react'
import { t } from '../i18n/translations'
import { DIFF_EXP, ACHIEVEMENTS, getClass, streakIcon, streakMultiplier, todayStr } from '../lib/game'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Sidebar'
import SocialPage from './SocialPage'
import ProfilePage from './ProfilePage'
import RewardsPage from './RewardsPage'
import DayHeader from '../components/DayHeader'
import { DndContext, DragOverlay, PointerSensor, TouchSensor, MeasuringStrategy, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { SortableHabitCard } from '../components/SortableHabitCard'

const CARD_COLORS = ['hc-0','hc-1','hc-2','hc-3','hc-4','hc-5']

export default function Dashboard({ game, userId, onLogout, theme, setTheme }) {
  const { profile, habits, goals, achievements, toasts, loading, lang,
    addHabit, completeHabit, deleteHabit,
    addGoal, tickGoal, deleteGoal, updateProfile } = game

  const [tab, setTab]          = useState('habits')
  const [habitModal, setHabit] = useState(false)
  const [goalModal,  setGoal]  = useState(false)
  const [editHabit,  setEditHabit] = useState(null)  // habit being edited
  const [selDiff, setSelDiff]  = useState('easy')
  const [checklistView, setChecklistView] = useState(() => localStorage.getItem('hq_checklist') === '1')
  const hNameRef = useRef(); const hCatRef = useRef()
  const gNameRef = useRef(); const gTypeRef = useRef(); const gTargetRef = useRef()
  const [selFreq, setSelFreq] = useState('daily')
  const [selDays, setSelDays] = useState([])
  const [heatmapData, setHeatmapData] = useState({})

  // ── Drag & drop state ──────────────────────────
  const [orderedHabits, setOrderedHabits] = useState([])
  const [activeId, setActiveId] = useState(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { distance: 8 } })
  )

  // Load heatmap data when habits tab is active
  useEffect(() => {
    if (tab !== 'habits' || !userId) return
    const loadHeatmap = async () => {
      const from = new Date()
      from.setDate(from.getDate() - 29)
      const { data } = await supabase
        .from('habit_logs')
        .select('logged_date')
        .eq('user_id', userId)
        .gte('logged_date', from.toISOString().split('T')[0])
      if (!data) return
      const counts = {}
      data.forEach(r => { counts[r.logged_date] = (counts[r.logged_date] || 0) + 1 })
      setHeatmapData(counts)
    }
    loadHeatmap()
  }, [tab, userId])

  // Sync orderedHabits from habits, preserving drag-set order
  useEffect(() => {
    setOrderedHabits(prev => {
      const map = new Map(habits.map(h => [h.id, h]))
      const sameSet = prev.length === habits.length && prev.every(h => map.has(h.id))
      if (!sameSet) {
        const kept  = prev.filter(h => map.has(h.id)).map(h => ({ ...h, ...map.get(h.id) }))
        const added = habits.filter(h => !prev.find(p => p.id === h.id))
        return [...kept, ...added]
      }
      return prev.map(h => ({ ...h, ...map.get(h.id) }))
    })
  }, [habits])

  if (loading) return <div className="loading">CARGANDO...</div>

  const multi       = streakMultiplier(Math.max(0,...habits.map(h=>Math.max(h.streak||0,h.best_streak||0))))
  const cls         = getClass(profile?.level||1, lang)
  const activeHabit = activeId ? orderedHabits.find(h => h.id === activeId) : null
  const activeIdx   = activeHabit ? orderedHabits.indexOf(activeHabit) : -1

  const todayDow = new Date().getDay()
  const visibleHabits = orderedHabits.filter(h => {
    const freq = h.frequency || 'daily'
    if (freq === 'weekly') return (h.frequency_days || []).includes(todayDow)
    if (freq === 'once') return !h.completed_once
    return true
  })
  const getHeatLevel = count => {
    if (!count) return 0
    const ratio = count / Math.max(1, habits.length)
    if (ratio >= 1) return 4
    if (ratio >= 0.75) return 3
    if (ratio >= 0.5) return 2
    return 1
  }

  const NAV = [
    { id:'habits',  icon:'⚔️', label: lang==='en'?'Habits':'Hábitos' },
    { id:'goals',   icon:'🎯', label: lang==='en'?'Goals':'Metas' },
    { id:'rewards', icon:'🎁', label: lang==='en'?'Rewards':'Premios' },
    { id:'social',  icon:'👥', label: 'Social' },
    { id:'profile', icon:'👤', label: lang==='en'?'Profile':'Perfil' },
  ]

  const ALL_TABS = [
    { id:'habits',  icon:'⚔️', label: lang==='en'?'Habits':'Hábitos' },
    { id:'goals',   icon:'🎯', label: lang==='en'?'Goals':'Metas' },
    { id:'rewards', icon:'🎁', label: lang==='en'?'Rewards':'Premios' },
    { id:'stats',   icon:'📊', label: 'Stats' },
    { id:'social',  icon:'👥', label: 'Social' },
    { id:'profile', icon:'👤', label: lang==='en'?'Profile':'Perfil' },
  ]

  // ── Drag & drop handlers ───────────────────────
  async function saveReorder(newOrder) {
    await Promise.all(
      newOrder.map((h, idx) => supabase.from('habits').update({ order_idx: idx }).eq('id', h.id))
    )
  }

  function handleDragStart({ active }) { setActiveId(active.id) }
  function handleDragCancel()          { setActiveId(null) }

  function handleDragEnd({ active, over }) {
    setActiveId(null)
    if (!over || active.id === over.id) return
    setOrderedHabits(prev => {
      const from = prev.findIndex(h => h.id === active.id)
      const to   = prev.findIndex(h => h.id === over.id)
      const next = arrayMove(prev, from, to)
      saveReorder(next)
      return next
    })
  }

  // ── Habit edit sheet ──────────────────────────
  async function saveHabitEdit(difficulty) {
    if (!editHabit) return
    await supabase.from('habits').update({ difficulty }).eq('id', editHabit.id)
    game.loadAll()
    setEditHabit(null)
  }

  async function confirmDeleteHabit(id) {
    setEditHabit(null)
    deleteHabit(id)
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <img src="/logo.png" alt="HabitQuest" style={{ width:36, height:36, borderRadius:8, objectFit:'cover' }} />
          <span style={{ fontFamily:'var(--mono)', fontSize:20, fontWeight:700, letterSpacing:-0.5 }}>HABITQUEST</span>
        </div>
        <div className="header-actions header-desktop-only" style={{ display:'flex', gap:8 }}>
          <button className="btn-icon" onClick={()=>setTheme(theme==='dark'?'light':'dark')}>
            {theme==='dark'?'☀️':'🌙'}
          </button>
        </div>
      </header>

      <div className="main-layout">
        <div className="sidebar-wrap">
          <Sidebar profile={profile} habits={habits} lang={lang} />
        </div>

        <main style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
          {/* Desktop tabs */}
          <div className="tabs">
            {ALL_TABS.map(item=>(
              <button key={item.id} className={`tab-btn ${tab===item.id?'on':''}`} onClick={()=>setTab(item.id)}>
                {item.icon} {item.label}
              </button>
            ))}
          </div>

          {/* ── HÁBITOS ── */}
          {tab==='habits' && (
            <div>
              <div className="sec-head">
                <div className="sec-title">{lang==='en'?'Daily Missions':'Misiones diarias'}</div>
                <button
                  onClick={() => { const n = !checklistView; setChecklistView(n); localStorage.setItem('hq_checklist', n?'1':'0') }}
                  title={checklistView ? (lang==='en'?'Card view':'Vista tarjetas') : (lang==='en'?'Checklist':'Checklist')}
                  style={{ background:'none', border:'1px solid var(--border)', borderRadius:8, padding:'5px 10px', cursor:'pointer', fontSize:16, color:'var(--text2)', lineHeight:1 }}>
                  {checklistView ? '⊞' : '☰'}
                </button>
              </div>

              <DayHeader lang={lang} />

              {multi>1 && (
                <div className="multiplier-banner">
                  <span>🔥 {lang==='en'?'Streak multiplier':'Multiplicador de racha'}</span>
                  <span style={{ fontFamily:'var(--mono)', fontSize:18, fontWeight:700 }}>×{multi.toFixed(1)}</span>
                </div>
              )}

              {habits.length===0 ? (
                <div style={{ textAlign:'center', padding:'60px 20px' }}>
                  <div style={{ fontSize:56, marginBottom:16 }}>⚔️</div>
                  <div style={{ fontSize:20, fontWeight:800, marginBottom:8 }}>
                    {lang==='en'?'Your adventure starts here':'Tu aventura empieza aquí'}
                  </div>
                  <div style={{ fontSize:15, color:'var(--text2)', marginBottom:28 }}>
                    {lang==='en'?'Add your first habit and start levelling up':'Añade tu primer hábito y empieza a subir de nivel'}
                  </div>
                  <button className="btn btn-primary" style={{ fontSize:16, padding:'14px 32px' }} onClick={()=>setHabit(true)}>
                    + {lang==='en'?'Add first habit':'Añadir primer hábito'}
                  </button>
                </div>
              ) : checklistView ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter}
                  measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
                  onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
                  <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:16, padding:'0 20px', boxShadow:'var(--shadow)' }}>
                    <SortableContext items={visibleHabits.map(h => h.id)} strategy={verticalListSortingStrategy}>
                      {visibleHabits.map((h, i) => (
                        <SortableHabitCard key={h.id} id={h.id}>
                          {({ listeners, isDragging }) => (
                            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'15px 0',
                              borderBottom: i < visibleHabits.length-1 ? '1px solid var(--border)' : 'none',
                              opacity: isDragging ? 0.25 : 1,
                              transition:'opacity .15s',
                              userSelect:'none', WebkitUserSelect:'none' }}>
                              <div {...listeners}
                                style={{ cursor:'grab', color:'var(--text3)', fontSize:18, flexShrink:0,
                                  padding:'0 2px', lineHeight:1,
                                  touchAction:'none', userSelect:'none', WebkitUserSelect:'none',
                                  WebkitTouchCallout:'none' }}>⠿</div>
                              <button
                                onClick={e => completeHabit(h.id, e.clientX, e.clientY)}
                                style={{ width:28, height:28, borderRadius:'50%', flexShrink:0,
                                  border: h.done_today ? 'none' : '2px solid var(--text3)',
                                  background: h.done_today ? 'var(--accent)' : 'transparent',
                                  cursor: 'pointer',
                                  display:'flex', alignItems:'center', justifyContent:'center',
                                  color:'var(--accent-fg)', fontSize:14, fontWeight:700,
                                  transition:'all .2s' }}>
                                {h.done_today ? '✓' : ''}
                              </button>
                              <span style={{ fontSize:18, fontWeight:600, transition:'all .2s', flex:1,
                                color: h.done_today ? 'var(--text3)' : 'var(--text)',
                                textDecoration: h.done_today ? 'line-through' : 'none',
                                userSelect:'none', WebkitUserSelect:'none' }}>
                                {h.name}
                              </span>
                            </div>
                          )}
                        </SortableHabitCard>
                      ))}
                    </SortableContext>
                  </div>
                  <DragOverlay dropAnimation={null}>
                    {activeHabit && (
                      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'15px 20px',
                        background:'var(--panel)', borderRadius:12,
                        opacity:0.95, transform:'scale(1.02)',
                        boxShadow:'0 20px 40px rgba(0,0,0,.3)', cursor:'grabbing',
                        userSelect:'none', WebkitUserSelect:'none' }}>
                        <div style={{ color:'var(--text3)', fontSize:18, flexShrink:0, padding:'0 2px', lineHeight:1 }}>⠿</div>
                        <span style={{ fontSize:18, fontWeight:600, flex:1,
                          color: activeHabit.done_today ? 'var(--text3)' : 'var(--text)',
                          textDecoration: activeHabit.done_today ? 'line-through' : 'none' }}>
                          {activeHabit.name}
                        </span>
                      </div>
                    )}
                  </DragOverlay>
                </DndContext>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter}
                  measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
                  onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
                  <div>
                    <SortableContext items={visibleHabits.map(h => h.id)} strategy={verticalListSortingStrategy}>
                      {visibleHabits.map((h, i) => {
                        const final    = Math.floor(DIFF_EXP[h.difficulty] * multi)
                        const colorCls = CARD_COLORS[i % CARD_COLORS.length]
                        const icon     = streakIcon(h.streak)
                        return (
                          <SortableHabitCard key={h.id} id={h.id}>
                            {({ listeners, isDragging }) => (
                              <div
                                className={`habit-card ${colorCls} ${h.done_today?'done-card':''}`}
                                onClick={() => { if(!h.done_today) setEditHabit(h) }}
                                style={{ cursor: h.done_today?'default':'pointer',
                                  opacity: isDragging ? 0.25 : 1,
                                  transition:'opacity .15s',
                                  userSelect:'none', WebkitUserSelect:'none',
                                  WebkitTouchCallout:'none' }}>
                                <div className="habit-card-top">
                                  <div {...listeners}
                                    style={{ cursor:'grab', fontSize:16, opacity:0.6,
                                      lineHeight:1, marginRight:4,
                                      touchAction:'none', userSelect:'none', WebkitUserSelect:'none',
                                      WebkitTouchCallout:'none' }}>⠿</div>
                                  <div className="habit-streak" style={{ userSelect:'none', WebkitUserSelect:'none' }}>
                                    ⚡ {h.streak||0}{h.streak>0&&<span>{icon}</span>}
                                  </div>
                                  <div className="week-checks">
                                    {[0,1,2,3,4,5,6].map(d=>(
                                      <div key={d} className={`week-dot ${d===6&&h.done_today?'filled':''}`} />
                                    ))}
                                  </div>
                                </div>
                                <div className="habit-card-bottom">
                                  <div>
                                    <div className="habit-title" style={{ userSelect:'none', WebkitUserSelect:'none' }}>{h.name}</div>
                                    <div className="habit-sub" style={{ userSelect:'none', WebkitUserSelect:'none' }}>
                                      +{final} EXP · <span className={`diff-pill dp-${h.difficulty}`}>{t(lang,`difficulties.${h.difficulty}`)}</span>
                                    </div>
                                  </div>
                                  <button className={`habit-check-btn ${h.done_today?'done':''}`}
                                    title={h.done_today?(lang==='en'?'Tap to undo':'Pulsa para desmarcar'):(lang==='en'?'Mark as done':'Marcar como hecho')}
                                    onClick={e=>{ e.stopPropagation(); completeHabit(h.id, e.clientX, e.clientY) }}>
                                    {h.done_today?'✓':''}
                                  </button>
                                </div>
                              </div>
                            )}
                          </SortableHabitCard>
                        )
                      })}
                    </SortableContext>
                  </div>
                  <DragOverlay dropAnimation={null}>
                    {activeHabit && (() => {
                      const final    = Math.floor(DIFF_EXP[activeHabit.difficulty] * multi)
                      const colorCls = CARD_COLORS[activeIdx % CARD_COLORS.length]
                      const icon     = streakIcon(activeHabit.streak)
                      return (
                        <div className={`habit-card ${colorCls} ${activeHabit.done_today?'done-card':''}`}
                          style={{ opacity:0.95, transform:'scale(1.02)',
                            boxShadow:'0 20px 40px rgba(0,0,0,.3)', cursor:'grabbing',
                            userSelect:'none', WebkitUserSelect:'none', WebkitTouchCallout:'none' }}>
                          <div className="habit-card-top">
                            <div style={{ cursor:'grabbing', fontSize:16, opacity:0.6, lineHeight:1, marginRight:4 }}>⠿</div>
                            <div className="habit-streak">⚡ {activeHabit.streak||0}{activeHabit.streak>0&&<span>{icon}</span>}</div>
                            <div className="week-checks">
                              {[0,1,2,3,4,5,6].map(d=>(
                                <div key={d} className={`week-dot ${d===6&&activeHabit.done_today?'filled':''}`} />
                              ))}
                            </div>
                          </div>
                          <div className="habit-card-bottom">
                            <div>
                              <div className="habit-title">{activeHabit.name}</div>
                              <div className="habit-sub">
                                +{final} EXP · <span className={`diff-pill dp-${activeHabit.difficulty}`}>{t(lang,`difficulties.${activeHabit.difficulty}`)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </DragOverlay>
                </DndContext>
              )}

              {/* Heatmap al final, 30 días */}
              {habits.length>0 && (
                <div className="heatmap-wrap" style={{ marginTop:8 }}>
                  <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:1, color:'var(--text3)', marginBottom:10 }}>
                    {lang==='en'?'LAST 30 DAYS':'ÚLTIMOS 30 DÍAS'}
                  </div>
                  <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                    {Array.from({length:30},(_,i)=>{
                      const d=new Date(); d.setDate(d.getDate()-(29-i))
                      const key=d.toISOString().split('T')[0]
                      return { key, lvl: getHeatLevel(heatmapData[key]||0) }
                    }).map(c=>(
                      <div key={c.key} className={`hm-cell hm-${c.lvl}`}
                        style={{ width:'calc((100% - 116px) / 30)', minWidth:8 }} title={c.key} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── METAS ── */}
          {tab==='goals' && (
            <div>
              <div className="sec-head">
                <div className="sec-title">{lang==='en'?'Goals':'Objetivos'}</div>
              </div>
              {goals.length===0 ? (
                <div style={{ textAlign:'center', padding:'60px 20px' }}>
                  <div style={{ fontSize:56, marginBottom:16 }}>🎯</div>
                  <div style={{ fontSize:20, fontWeight:800, marginBottom:8 }}>
                    {lang==='en'?'Set your first goal':'Pon tu primer objetivo'}
                  </div>
                  <button className="btn btn-primary" style={{ fontSize:16, padding:'14px 32px' }} onClick={()=>setGoal(true)}>
                    + {lang==='en'?'Add goal':'Añadir objetivo'}
                  </button>
                </div>
              ) : goals.map(g=>{
                const pct = Math.min(100,(g.progress/g.target)*100)
                const done = g.progress >= g.target
                const reward = g.type==='weekly'?300:1000
                return (
                  <div key={g.id} className={`goal-card ${done?'done-goal':''}`}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                      <div className="goal-name">{done?'✓ ':''}{g.name}</div>
                      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                        <span className={`goal-type-pill gp-${g.type}`}>
                          {g.type==='weekly'?(lang==='en'?'WEEKLY':'SEMANAL'):(lang==='en'?'MONTHLY':'MENSUAL')}
                        </span>
                        <button className="btn-icon" style={{ width:26,height:26 }}
                          onClick={()=>{if(confirm(t(lang,'deleteConfirm')))deleteGoal(g.id)}}>✕</button>
                      </div>
                    </div>
                    <div style={{ fontSize:13, color:'var(--text3)', marginBottom:10 }}>🏆 +{reward} EXP {lang==='en'?'on completion':'al completar'}</div>
                    <div className="progress-track"><div className="progress-fill" style={{ width:pct+'%' }}/></div>

                    {/* +1 button — grande y visual */}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:10 }}>
                      <span style={{ fontFamily:'var(--mono)', fontSize:16, fontWeight:700 }}>{g.progress}<span style={{ color:'var(--text3)', fontWeight:400 }}>/{g.target}</span></span>
                      {!done && (
                        <button onClick={e=>tickGoal(g.id,e.clientX,e.clientY)}
                          style={{ background:'var(--accent)', color:'var(--accent-fg)', border:'none', borderRadius:12, padding:'10px 20px', fontSize:16, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', gap:6, transition:'all .15s', fontFamily:'var(--font)' }}>
                          <span style={{ fontSize:20, lineHeight:1 }}>+</span>
                          <span>{lang==='en'?'1 rep':'1 rep'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── STATS ── */}
          {tab==='stats' && (
            <div>
              <div className="sec-head"><div className="sec-title">Stats</div></div>
              <div className="stat-grid">
                {[
                  [profile?.total_exp||0,  lang==='en'?'Total EXP':'EXP total'],
                  [profile?.total_done||0, lang==='en'?'Habits done':'Hábitos hechos'],
                  [Math.max(0,...habits.map(h=>h.best_streak||0)), lang==='en'?'Best streak':'Mejor racha'],
                  [profile?.goals_done||0, lang==='en'?'Goals done':'Objetivos logrados'],
                ].map(([v,l])=>(
                  <div key={l} className="stat-card">
                    <div className="stat-val">{v}</div>
                    <div className="stat-lbl">{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:18, boxShadow:'var(--shadow)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <span style={{ background:'var(--accent)', color:'var(--accent-fg)', fontFamily:'var(--mono)', fontSize:11, fontWeight:700, padding:'3px 12px', borderRadius:20 }}>LV {profile?.level||1}</span>
                  <span style={{ fontSize:13, color:'var(--text2)' }}>{cls.displayName} · {cls.displayTitle}</span>
                </div>
                <div className="bar-track" style={{ height:8, marginBottom:6 }}>
                  <div className="bar-fill fill-exp" style={{ width:Math.min(100,((profile?.exp||0)/(profile?.exp_to_next||100))*100)+'%' }}/>
                </div>
                <div style={{ fontSize:12, color:'var(--text3)', fontFamily:'var(--mono)' }}>
                  {(profile?.exp_to_next||100)-(profile?.exp||0)} EXP {lang==='en'?'to next level':'para siguiente nivel'}
                </div>
              </div>
              <div style={{ display:'flex', gap:8, marginTop:12, flexWrap:'wrap' }}>
                <button className="btn btn-ghost" onClick={()=>{
                  const a=document.createElement('a')
                  a.href=URL.createObjectURL(new Blob([JSON.stringify({profile,habits,goals,achievements},null,2)],{type:'application/json'}))
                  a.download=`habitquest-${todayStr()}.json`; a.click()
                }}>{t(lang,'exportData')}</button>
                {profile?.username && (
                  <button className="btn btn-ghost" onClick={()=>{
                    const url=`${window.location.origin}/u/${profile.username}`
                    navigator.clipboard.writeText(url)
                    .then(()=>alert(lang==='en'?'Profile link copied!':'¡Enlace de perfil copiado!'))
                  }}>
                    🔗 {lang==='en'?'Share profile':'Compartir perfil'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── REWARDS ── */}
          {tab==='rewards' && <RewardsPage profile={profile} lang={lang} />}

          {/* ── SOCIAL ── */}
          {tab==='social' && <SocialPage userId={userId} lang={lang} />}

          {/* ── PERFIL ── */}
          {tab==='profile' && (
            <ProfilePage
              profile={profile}
              achievements={achievements}
              updateProfile={updateProfile}
              lang={lang}
              theme={theme}
              setTheme={setTheme}
              onLogout={onLogout}
            />
          )}
        </main>
      </div>

      {/* FAB */}
      {(tab==='habits'||tab==='goals') && (
        <button onClick={()=>tab==='habits'?setHabit(true):setGoal(true)}
          style={{ position:'fixed', bottom:90, right:20, width:58, height:58, borderRadius:'50%', background:'var(--accent)', color:'var(--accent-fg)', border:'none', fontSize:30, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 20px rgba(0,0,0,.35)', cursor:'pointer', zIndex:90 }}>
          +
        </button>
      )}

      {/* BOTTOM NAV */}
      <nav className="bottom-nav">
        {NAV.map(item=>(
          <button key={item.id} className={`nav-item ${tab===item.id?'on':''}`} onClick={()=>setTab(item.id)}>
            <span className="nav-item-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* ── MODAL: Nuevo hábito ── */}
      {habitModal && (
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setHabit(false)}>
          <div className="modal">
            <div className="modal-handle"/>
            <div className="modal-title">{lang==='en'?'New Habit':'Nuevo hábito'}</div>
            <div className="form-group">
              <label className="form-label">{lang==='en'?'Name':'Nombre'}</label>
              <input ref={hNameRef} className="form-input" placeholder={t(lang,'habitNamePlaceholder')} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">{lang==='en'?'Category':'Categoría'}</label>
              <select ref={hCatRef} className="form-select">
                {Object.entries(t(lang,'categories')).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{lang==='en'?'Difficulty':'Dificultad'}</label>
              <div className="diff-sel">
                {['easy','normal','hard','legendary'].map(d=>(
                  <div key={d} className={`diff-opt ${selDiff===d?'sel-'+d:''}`} onClick={()=>setSelDiff(d)}>
                    <div className="diff-opt-name" style={{ color:`var(--d-${d})` }}>{t(lang,`difficulties.${d}`)}</div>
                    <div className="diff-opt-exp">+{DIFF_EXP[d]} EXP</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{lang==='en'?'Frequency':'Frecuencia'}</label>
              <div style={{ display:'flex', gap:8 }}>
                {[
                  { id:'daily',  label: lang==='en'?'Daily':'Diario' },
                  { id:'weekly', label: lang==='en'?'Weekly':'Semanal' },
                  { id:'once',   label: lang==='en'?'Once':'Una vez' },
                ].map(f=>(
                  <button key={f.id} type="button" onClick={()=>setSelFreq(f.id)}
                    style={{ flex:1, padding:'9px 4px', borderRadius:8,
                      border:`1.5px solid ${selFreq===f.id?'var(--accent)':'var(--border)'}`,
                      background:'var(--bg3)',
                      color: selFreq===f.id?'var(--text)':'var(--text2)',
                      fontWeight:700, fontSize:13, cursor:'pointer', transition:'all .15s',
                      fontFamily:'var(--font)' }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            {selFreq==='weekly' && (
              <div className="form-group">
                <label className="form-label">{lang==='en'?'Days':'Días'}</label>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {(lang==='en'
                    ? ['Su','Mo','Tu','We','Th','Fr','Sa']
                    : ['D','L','M','X','J','V','S']
                  ).map((day,i)=>(
                    <button key={i} type="button"
                      onClick={()=>setSelDays(prev=>prev.includes(i)?prev.filter(d=>d!==i):[...prev,i])}
                      style={{ width:38, height:38, borderRadius:'50%',
                        border:`1.5px solid ${selDays.includes(i)?'var(--accent)':'var(--border)'}`,
                        background: selDays.includes(i)?'var(--accent)':'var(--bg3)',
                        color: selDays.includes(i)?'var(--accent-fg)':'var(--text2)',
                        fontWeight:700, fontSize:12, cursor:'pointer', transition:'all .15s',
                        fontFamily:'var(--font)' }}>
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={()=>{ setHabit(false); setSelFreq('daily'); setSelDays([]) }}>{t(lang,'cancel')}</button>
              <button className="btn btn-primary" onClick={()=>{
                const n=hNameRef.current?.value?.trim(); if(!n)return
                addHabit(n,hCatRef.current?.value||'other',selDiff,selFreq,selDays)
                setHabit(false); setSelFreq('daily'); setSelDays([])
              }}>{lang==='en'?'Add habit':'Añadir hábito'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── SHEET: Editar hábito (al pulsar tarjeta) ── */}
      {editHabit && (
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setEditHabit(null)}>
          <div className="modal">
            <div className="modal-handle"/>
            <div className="modal-title" style={{ marginBottom:6 }}>{editHabit.name}</div>
            <div style={{ fontSize:13, color:'var(--text2)', marginBottom:20 }}>
              {lang==='en'?'Change difficulty or delete this habit':'Cambia la dificultad o elimina este hábito'}
            </div>
            <div className="form-group">
              <label className="form-label">{lang==='en'?'Difficulty':'Dificultad'}</label>
              <div className="diff-sel">
                {['easy','normal','hard','legendary'].map(d=>(
                  <div key={d} className={`diff-opt ${(selDiff||editHabit.difficulty)===d?'sel-'+d:''}`}
                    onClick={()=>setSelDiff(d)}>
                    <div className="diff-opt-name" style={{ color:`var(--d-${d})` }}>{t(lang,`difficulties.${d}`)}</div>
                    <div className="diff-opt-exp">+{DIFF_EXP[d]} EXP</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-actions" style={{ justifyContent:'space-between' }}>
              <button className="btn btn-ghost" style={{ color:'var(--red)', borderColor:'var(--red)' }}
                onClick={()=>confirmDeleteHabit(editHabit.id)}>
                🗑 {lang==='en'?'Delete':'Eliminar'}
              </button>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-ghost" onClick={()=>setEditHabit(null)}>{t(lang,'cancel')}</button>
                <button className="btn btn-primary" onClick={()=>saveHabitEdit(selDiff||editHabit.difficulty)}>
                  {lang==='en'?'Save':'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Nuevo objetivo ── */}
      {goalModal && (
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setGoal(false)}>
          <div className="modal">
            <div className="modal-handle"/>
            <div className="modal-title">{lang==='en'?'New Goal':'Nuevo objetivo'}</div>
            <div className="form-group">
              <label className="form-label">{lang==='en'?'Name':'Nombre'}</label>
              <input ref={gNameRef} className="form-input" placeholder={t(lang,'goalNamePlaceholder')} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">{lang==='en'?'Type':'Tipo'}</label>
              <select ref={gTypeRef} className="form-select">
                <option value="weekly">{t(lang,'weeklyReward')}</option>
                <option value="monthly">{t(lang,'monthlyReward')}</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{lang==='en'?'Times to complete':'Veces a completar'}</label>
              <input ref={gTargetRef} className="form-input" type="number" defaultValue={7} min={1} max={365} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={()=>setGoal(false)}>{t(lang,'cancel')}</button>
              <button className="btn btn-primary" onClick={()=>{
                const n=gNameRef.current?.value?.trim(); if(!n)return
                addGoal(n,gTypeRef.current?.value||'weekly',parseInt(gTargetRef.current?.value)||7)
                setGoal(false)
              }}>{lang==='en'?'Add goal':'Añadir objetivo'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="toast-wrap">
        {toasts.map(toast=>(
          <div key={toast.id} className="toast">{toast.big} {toast.sub}</div>
        ))}
      </div>
    </div>
  )
}
