import { useState, useRef } from 'react'
import { t } from '../i18n/translations'
import { DIFF_EXP, ACHIEVEMENTS, POWERUPS, getClass, streakIcon, streakMultiplier, todayStr } from '../lib/game'
import Sidebar from '../components/Sidebar'
import FeedPage from './FeedPage'
import LeaderboardPage from './LeaderboardPage'
import ProfilePage from './ProfilePage'

const CARD_COLORS = ['hc-0','hc-1','hc-2','hc-3','hc-4','hc-5']
const DIFF_COLORS = { easy:'var(--d-easy)', normal:'var(--d-normal)', hard:'var(--d-hard)', legendary:'var(--d-legendary)' }

const NAV = [
  { id:'habits',       icon:'⚔️',  label:'Hábitos' },
  { id:'goals',        icon:'🎯',  label:'Metas' },
  { id:'achievements', icon:'🏆',  label:'Logros' },
  { id:'leaderboard',  icon:'👑',  label:'Ranking' },
  { id:'feed',         icon:'📡',  label:'Feed' },
]
const NAV_EN = [
  { id:'habits',       icon:'⚔️',  label:'Habits' },
  { id:'goals',        icon:'🎯',  label:'Goals' },
  { id:'achievements', icon:'🏆',  label:'Achievements' },
  { id:'leaderboard',  icon:'👑',  label:'Ranking' },
  { id:'feed',         icon:'📡',  label:'Feed' },
]

export default function Dashboard({ game, userId, onLogout, theme, toggleTheme }) {
  const { profile, habits, goals, achievements, toasts, loading, lang,
    addHabit, completeHabit, deleteHabit,
    addGoal, tickGoal, deleteGoal, updateProfile } = game

  const [tab, setTab]         = useState('habits')
  const [habitModal, setHabit]= useState(false)
  const [goalModal,  setGoal] = useState(false)
  const [selDiff, setSelDiff] = useState('easy')
  const hNameRef = useRef(); const hCatRef = useRef()
  const gNameRef = useRef(); const gTypeRef = useRef(); const gTargetRef = useRef()

  if (loading) return <div className="loading">CARGANDO...</div>

  const multi     = streakMultiplier(Math.max(0,...habits.map(h=>Math.max(h.streak||0,h.best_streak||0))))
  const cls       = getClass(profile?.level||1, lang)
  const navItems  = lang==='en' ? NAV_EN : NAV

  const ALL_TABS = [
    ...navItems,
    { id:'stats',   icon:'📊', label: lang==='en'?'Stats':'Stats' },
    { id:'profile', icon:'👤', label: lang==='en'?'Profile':'Perfil' },
  ]

  function buildHeatmap() {
    return Array.from({length:84},(_,i)=>{
      const d=new Date(); d.setDate(d.getDate()-(83-i))
      return { key:d.toISOString().split('T')[0], lvl:0 }
    })
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div style={{ fontFamily:'var(--mono)', fontSize:18, fontWeight:700 }}>⚔ HABITQUEST</div>
        <div className="header-actions">
          {['es','en'].map(l=>(
            <button key={l} className="btn btn-ghost btn-sm"
              style={{ fontWeight:lang===l?700:400, padding:'6px 10px' }}
              onClick={()=>updateProfile({language:l})}>{l.toUpperCase()}</button>
          ))}
          <button className="btn-icon" onClick={toggleTheme} title={theme==='dark'?'Modo claro':'Modo oscuro'}>
            {theme==='dark'?'☀️':'🌙'}
          </button>
          <button className="btn-icon" onClick={()=>updateProfile({sound_on:!profile?.sound_on})} title="Sonido">
            {profile?.sound_on?'🔊':'🔇'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onLogout}>{t(lang,'logout')}</button>
        </div>
      </header>

      <div className="main-layout">
        {/* Sidebar (desktop only) */}
        <div className="sidebar-wrap">
          <Sidebar profile={profile} habits={habits} lang={lang} />
        </div>

        <main>
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
                <button className="btn btn-primary" onClick={()=>setHabit(true)}>+ {lang==='en'?'New':'Nuevo'}</button>
              </div>

              {/* Heatmap */}
              <div className="heatmap-wrap">
                <div style={{fontFamily:'var(--mono)',fontSize:11,letterSpacing:1,color:'var(--text2)',marginBottom:10}}>
                  {lang==='en'?'LAST 84 DAYS':'RACHA ÚLTIMOS 84 DÍAS'}
                </div>
                <div className="hm-grid">
                  {buildHeatmap().map(c=>(
                    <div key={c.key} className={`hm-cell hm-${c.lvl}`} title={c.key} />
                  ))}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:6,marginTop:8,fontSize:11,color:'var(--text3)'}}>
                  <span>{lang==='en'?'Less':'Menos'}</span>
                  {[0,1,2,3,4].map(l=><div key={l} className={`hm-cell hm-${l}`} style={{width:11,height:11}}/>)}
                  <span>{lang==='en'?'More':'Más'}</span>
                </div>
              </div>

              {/* Multiplier */}
              {multi>1 && (
                <div className="multiplier-banner">
                  <span>🔥 {lang==='en'?'Streak multiplier active':'Multiplicador de racha activo'}</span>
                  <span>×{multi.toFixed(1)}</span>
                </div>
              )}

              {habits.length===0
                ? <div className="empty">{lang==='en'?'No habits yet. Start your adventure!':'Sin hábitos. ¡Empieza tu aventura!'}</div>
                : habits.map((h,i)=>{
                  const base=DIFF_EXP[h.difficulty]; const final=Math.floor(base*multi)
                  const icon=streakIcon(h.streak)
                  const colorCls=CARD_COLORS[i%CARD_COLORS.length]
                  return (
                    <div key={h.id} className={`habit-card ${colorCls} ${h.done_today?'done-card':''}`}>
                      {/* Top row */}
                      <div className="habit-card-top">
                        <div className="habit-streak">
                          ⚡ {h.streak||0}
                          {h.streak>0 && <span>{icon}</span>}
                        </div>
                        {/* 7-day dots — placeholder circles for now */}
                        <div className="week-checks">
                          {[0,1,2,3,4,5,6].map(d=>(
                            <div key={d} className={`week-dot ${d===6&&h.done_today?'filled':''}`} />
                          ))}
                        </div>
                      </div>
                      {/* Bottom row */}
                      <div className="habit-card-bottom">
                        <div>
                          <div className="habit-title">{h.name}</div>
                          <div className="habit-sub">+{final} EXP · <span className={`diff-pill dp-${h.difficulty}`}>{t(lang,`difficulties.${h.difficulty}`)}</span></div>
                        </div>
                        <button className={`habit-check-btn ${h.done_today?'done':''}`}
                          onClick={e=>completeHabit(h.id,e.clientX,e.clientY)}
                          disabled={h.done_today}>
                          {h.done_today?'✓':''}
                        </button>
                      </div>
                      {/* Delete on hover */}
                      <div className="habit-card-actions">
                        <button className="btn-icon" style={{width:26,height:26,fontSize:12,background:'rgba(0,0,0,.15)',color:'var(--ct)'}}
                          onClick={()=>{if(confirm(t(lang,'deleteConfirm')))deleteHabit(h.id)}}>✕</button>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}

          {/* ── OBJETIVOS ── */}
          {tab==='goals' && (
            <div>
              <div className="sec-head">
                <div className="sec-title">{lang==='en'?'Goals':'Objetivos'}</div>
                <button className="btn btn-primary" onClick={()=>setGoal(true)}>+ {lang==='en'?'New':'Nuevo'}</button>
              </div>
              {goals.length===0
                ? <div className="empty">{lang==='en'?'What do you aspire to?':'¿A qué aspiras, héroe?'}</div>
                : goals.map(g=>{
                  const pct=Math.min(100,(g.progress/g.target)*100)
                  const done=g.progress>=g.target
                  const reward=g.type==='weekly'?300:1000
                  return (
                    <div key={g.id} className={`goal-card ${done?'done-goal':''}`}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4}}>
                        <div className="goal-name">{done?'✓ ':''}{g.name}</div>
                        <span className={`goal-type-pill gp-${g.type}`}>{g.type==='weekly'?(lang==='en'?'WEEKLY':'SEMANAL'):(lang==='en'?'MONTHLY':'MENSUAL')}</span>
                      </div>
                      <div style={{fontSize:13,color:'var(--text3)',marginBottom:6}}>🏆 +{reward} EXP {lang==='en'?'on completion':'al completar'}</div>
                      <div className="progress-track"><div className="progress-fill" style={{width:pct+'%'}}/></div>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <span style={{fontSize:14,fontWeight:600,fontFamily:'var(--mono)'}}>{g.progress}/{g.target}</span>
                        <div style={{display:'flex',gap:6}}>
                          {!done && <button className="btn btn-ghost btn-sm" onClick={e=>tickGoal(g.id,e.clientX,e.clientY)}>+1</button>}
                          <button className="btn-icon" style={{width:28,height:28}} onClick={()=>{if(confirm(t(lang,'deleteConfirm')))deleteGoal(g.id)}}>✕</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}

          {/* ── LOGROS ── */}
          {tab==='achievements' && (
            <div>
              <div className="sec-head"><div className="sec-title">{lang==='en'?'Achievements':'Sala de trofeos'}</div></div>
              <div className="ach-grid">
                {ACHIEVEMENTS.map(a=>{
                  const on=achievements.some(x=>x.achievement_id===a.id)
                  return (
                    <div key={a.id} className={`ach-card ${on?'on':'locked'}`}>
                      <div className="ach-icon">{a.icon}</div>
                      <div>
                        <div className="ach-name">{lang==='en'?a.nameEn:a.name}</div>
                        <div className="ach-desc">{lang==='en'?a.descEn:a.desc}</div>
                        {on&&<div className="ach-stamp">✓ {lang==='en'?'UNLOCKED':'DESBLOQUEADO'}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── RANKING ── */}
          {tab==='leaderboard' && <LeaderboardPage userId={userId} lang={lang} />}

          {/* ── FEED ── */}
          {tab==='feed' && <FeedPage userId={userId} lang={lang} />}

          {/* ── STATS ── */}
          {tab==='stats' && (
            <div>
              <div className="sec-head"><div className="sec-title">Stats</div></div>
              <div className="stat-grid">
                {[
                  [profile?.total_exp||0, lang==='en'?'Total EXP':'EXP total'],
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

              {/* Level */}
              <div style={{background:'var(--panel)',border:'1px solid var(--border)',borderRadius:'var(--r)',padding:18,marginBottom:16,boxShadow:'var(--shadow)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                  <span style={{background:'var(--accent)',color:'var(--accent-fg)',fontFamily:'var(--mono)',fontSize:11,fontWeight:700,padding:'3px 12px',borderRadius:20}}>LV {profile?.level||1}</span>
                  <span style={{fontSize:13,color:'var(--text2)'}}>{cls.displayName} · {cls.displayTitle}</span>
                </div>
                <div className="bar-track" style={{height:8,marginBottom:6}}>
                  <div className="bar-fill fill-exp" style={{width:Math.min(100,((profile?.exp||0)/(profile?.exp_to_next||100))*100)+'%'}}/>
                </div>
                <div style={{fontSize:12,color:'var(--text3)',fontFamily:'var(--mono)'}}>{(profile?.exp_to_next||100)-(profile?.exp||0)} EXP {lang==='en'?'to next level':'para siguiente nivel'}</div>
              </div>

              {/* Export */}
              <button className="btn btn-ghost" onClick={()=>{
                const a=document.createElement('a')
                a.href=URL.createObjectURL(new Blob([JSON.stringify({profile,habits,goals,achievements},null,2)],{type:'application/json'}))
                a.download=`habitquest-${todayStr()}.json`; a.click()
              }}>{t(lang,'exportData')}</button>
            </div>
          )}

          {/* ── PERFIL ── */}
          {tab==='profile' && <ProfilePage profile={profile} updateProfile={updateProfile} lang={lang} />}
        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="bottom-nav">
        {navItems.map(item=>(
          <button key={item.id} className={`nav-item ${tab===item.id?'on':''}`} onClick={()=>setTab(item.id)}>
            <span className="nav-item-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
        <button className={`nav-item ${tab==='profile'||tab==='stats'?'on':''}`} onClick={()=>setTab('profile')}>
          <span className="nav-item-icon">👤</span>
          <span>{lang==='en'?'Profile':'Perfil'}</span>
        </button>
      </nav>

      {/* MODAL HÁBITO */}
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
                    <div className="diff-opt-name" style={{color:`var(--d-${d})`}}>{t(lang,`difficulties.${d}`)}</div>
                    <div className="diff-opt-exp">+{DIFF_EXP[d]} EXP</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={()=>setHabit(false)}>{t(lang,'cancel')}</button>
              <button className="btn btn-primary" onClick={()=>{
                const n=hNameRef.current?.value?.trim(); if(!n)return
                addHabit(n,hCatRef.current?.value||'other',selDiff); setHabit(false)
              }}>{lang==='en'?'Add habit':'Añadir hábito'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL OBJETIVO */}
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
                addGoal(n,gTypeRef.current?.value||'weekly',parseInt(gTargetRef.current?.value)||7); setGoal(false)
              }}>{lang==='en'?'Add goal':'Añadir objetivo'}</button>
            </div>
          </div>
        </div>
      )}

      {/* TOASTS */}
      <div className="toast-wrap">
        {toasts.map(t=>(
          <div key={t.id} className="toast">{t.big} {t.sub}</div>
        ))}
      </div>
    </div>
  )
}
