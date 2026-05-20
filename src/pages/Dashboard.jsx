import { useState, useRef } from 'react'
import { t } from '../i18n/translations'
import { DIFF_EXP, ACHIEVEMENTS, POWERUPS, getClass, streakIcon, streakMultiplier, todayStr } from '../lib/game'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Sidebar'
import FeedPage from './FeedPage'
import LeaderboardPage from './LeaderboardPage'
import ProfilePage from './ProfilePage'

const DIFF_COLORS = { easy:'var(--green)', normal:'var(--blue)', hard:'var(--orange)', legendary:'var(--purple)' }
const DIFF_BORDER = { easy:'rgba(68,255,136,.3)', normal:'rgba(68,136,255,.3)', hard:'rgba(255,136,51,.3)', legendary:'rgba(204,68,255,.4)' }

export default function Dashboard({ game, userId, onLogout }) {
  const { profile, habits, goals, achievements, toasts, loading, lang,
    addHabit, completeHabit, deleteHabit,
    addGoal, tickGoal, deleteGoal, updateProfile } = game

  const [activeTab, setTab] = useState('habits')

  // Modal state
  const [habitModal, setHabitModal] = useState(false)
  const [goalModal,  setGoalModal]  = useState(false)
  const [selDiff, setSelDiff]       = useState('easy')
  const hNameRef    = useRef(); const hCatRef = useRef()
  const gNameRef    = useRef(); const gTypeRef = useRef(); const gTargetRef = useRef()

  if (loading) return <div className="loading">{t(lang,'loading').toUpperCase()}</div>

  const maxStreak = Math.max(0, ...habits.map(h => Math.max(h.streak||0, h.best_streak||0)))
  const multi     = streakMultiplier(maxStreak)

  // ── Heatmap data ──────────────────────────────
  function buildHeatmap() {
    const cells = []
    for (let i = 83; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      // Count from habit_logs not available here in client — use history from habits
      const n = 0 // placeholder; real count comes from habit_logs fetched separately
      const lvl = n === 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 5 ? 3 : 4
      cells.push({ key, lvl, n })
    }
    return cells
  }

  // ── TABS ─────────────────────────────────────
  const TABS = [
    { id:'habits',      label: `⚔ ${t(lang,'habits').toUpperCase()}` },
    { id:'goals',       label: `🎯 ${t(lang,'goals').toUpperCase()}` },
    { id:'achievements',label: `🏆 ${t(lang,'achievements').toUpperCase()}` },
    { id:'leaderboard', label: `👑 ${t(lang,'leaderboard').toUpperCase()}` },
    { id:'feed',        label: `📡 ${t(lang,'feed').toUpperCase()}` },
    { id:'stats',       label: `📊 ${t(lang,'stats').toUpperCase()}` },
    { id:'profile',     label: `👤 ${t(lang,'profile').toUpperCase()}` },
  ]

  const cls = getClass(profile?.level||1, lang)
  const totalDone = profile?.total_done || 0
  const bestStreak = Math.max(0, ...habits.map(h=>h.best_streak||0))
  const currentStreak = Math.max(0, ...habits.map(h=>h.streak||0))

  return (
    <div className="app">

      {/* Header */}
      <header style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 0 16px', borderBottom:'1px solid var(--border)', marginBottom:20 }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:20, fontWeight:700, color:'var(--accent)', letterSpacing:2 }}>⚔ HABITQUEST</div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          {/* Language */}
          {['es','en'].map(l => (
            <button key={l} className="btn-ghost"
              style={{ padding:'4px 8px', borderColor: lang===l?'var(--accent)':'var(--border)', color: lang===l?'var(--accent)':'var(--text2)' }}
              onClick={() => updateProfile({ language: l })}>
              {l.toUpperCase()}
            </button>
          ))}
          {/* Sound */}
          <button className="btn-ghost" style={{ padding:'4px 8px', opacity: profile?.sound_on ? 1 : .4 }}
            onClick={() => updateProfile({ sound_on: !profile?.sound_on })}>
            {profile?.sound_on ? '🔊' : '🔇'}
          </button>
          <button className="btn-ghost" onClick={onLogout}>{t(lang,'logout')}</button>
        </div>
      </header>

      <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:20, alignItems:'start' }} className="main-layout">
        <Sidebar profile={profile} habits={habits} lang={lang} />

        <main style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Tabs */}
          <div style={{ display:'flex', gap:0, background:'var(--panel)', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden', flexWrap:'wrap' }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setTab(tab.id)}
                style={{ flex:1, minWidth:'fit-content', padding:'10px 6px', background: activeTab===tab.id ? 'var(--bg3)' : 'none', border:'none', borderRight:'1px solid var(--border)', color: activeTab===tab.id ? 'var(--accent)' : 'var(--text3)', fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:.5, cursor:'pointer', transition:'all .2s' }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── HÁBITOS ─────────────────────────── */}
          {activeTab === 'habits' && (
            <div>
              <div className="sec-head">
                <div className="sec-title">{t(lang,'dailyMissions').toUpperCase()}</div>
                <button className="btn-primary" onClick={() => setHabitModal(true)}>{t(lang,'newHabit')}</button>
              </div>

              {/* Heatmap */}
              <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:8, padding:16, marginBottom:16 }}>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:11, letterSpacing:1, color:'var(--text2)', marginBottom:12 }}>
                  {t(lang,'heatmapTitle').toUpperCase()}
                </div>
                <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
                  {buildHeatmap().map(c => (
                    <div key={c.key} className={`hm-cell hm-${c.lvl}`} title={`${c.key}: ${c.n} ${c.n===1?t(lang,'completed'):t(lang,'completedPlural')}`} />
                  ))}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:8, fontSize:11, color:'var(--text3)', fontFamily:'var(--font-mono)' }}>
                  <span>{t(lang,'less')}</span>
                  {[0,1,2,3,4].map(l => <div key={l} className={`hm-cell hm-${l}`} style={{width:12,height:12}} />)}
                  <span>{t(lang,'more')}</span>
                </div>
              </div>

              {/* Streak multiplier banner */}
              {multi > 1 && (
                <div style={{ background:'rgba(212,255,0,.07)', border:'1px solid rgba(212,255,0,.3)', borderRadius:8, padding:'10px 14px', marginBottom:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--accent)' }}>
                    🔥 {lang==='en'?'Streak multiplier active':'Multiplicador de racha activo'}
                  </span>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:14, fontWeight:700, color:'var(--accent)' }}>×{multi.toFixed(1)}</span>
                </div>
              )}

              {habits.length === 0
                ? <div className="empty">{t(lang,'noHabits')}</div>
                : habits.map(h => {
                  const base  = DIFF_EXP[h.difficulty]
                  const final = Math.floor(base * multi)
                  const icon  = streakIcon(h.streak)
                  const color = DIFF_COLORS[h.difficulty]
                  return (
                    <div key={h.id} style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:8, padding:'14px 16px', display:'grid', gridTemplateColumns:'1fr auto', gap:12, alignItems:'center', marginBottom:8, opacity: h.done_today?.5:1, position:'relative', overflow:'hidden' }}>
                      <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background:color, borderRadius:'8px 0 0 8px', boxShadow: h.difficulty==='legendary'?`0 0 8px ${color}`:'' }} />
                      <div style={{ paddingLeft:6 }}>
                        <div style={{ fontSize:16, fontWeight:600, color: h.done_today?'var(--text3)':'var(--text)', textDecoration: h.done_today?'line-through':'none', marginBottom:5 }}>{h.name}</div>
                        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                          <span className={`diff-pill dp-${h.difficulty}`}>{t(lang,`difficulties.${h.difficulty}`)}</span>
                          {h.streak > 0 && <span style={{ fontSize:13, color:'var(--text2)' }}>{icon} {h.streak} {t(lang,'days')}</span>}
                          <span style={{ fontSize:13, color:'var(--accent)', fontFamily:'var(--font-mono)' }}>+{final} EXP{multi>1?` ×${multi.toFixed(1)}`:''}</span>
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                        <button onClick={e => completeHabit(h.id, e.clientX, e.clientY)} disabled={h.done_today}
                          style={{ width:38, height:38, borderRadius:'50%', border:`2px solid ${h.done_today?'var(--green)':'var(--border2)'}`, background: h.done_today?'rgba(68,255,136,.12)':'transparent', color: h.done_today?'var(--green)':'var(--text3)', fontSize:17, cursor: h.done_today?'default':'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .25s' }}>
                          {h.done_today ? '✓' : '○'}
                        </button>
                        <button className="btn-icon" onClick={() => { if(confirm(t(lang,'deleteConfirm'))) deleteHabit(h.id) }}>✕</button>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}

          {/* ── OBJETIVOS ───────────────────────── */}
          {activeTab === 'goals' && (
            <div>
              <div className="sec-head">
                <div className="sec-title">{t(lang,'goals').toUpperCase()}</div>
                <button className="btn-primary" onClick={() => setGoalModal(true)}>{t(lang,'newGoal')}</button>
              </div>
              {goals.length === 0
                ? <div className="empty">{t(lang,'noGoals')}</div>
                : goals.map(g => {
                  const pct    = Math.min(100, (g.progress/g.target)*100)
                  const done   = g.progress >= g.target
                  const reward = g.type==='weekly' ? 300 : 1000
                  const typeLabel = g.type==='weekly' ? t(lang,'weekly') : t(lang,'monthly')
                  return (
                    <div key={g.id} style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:8, padding:'14px 16px', marginBottom:8, opacity: done?.4:1 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                        <div style={{ fontSize:16, fontWeight:600 }}>{done?'✓ ':''}{g.name}</div>
                        <span style={{ fontFamily:'var(--font-mono)', fontSize:9, fontWeight:700, letterSpacing:1, padding:'2px 8px', borderRadius:20, background: g.type==='weekly'?'rgba(68,136,255,.12)':'rgba(204,68,255,.12)', color: g.type==='weekly'?'var(--blue)':'var(--purple)', border:`1px solid ${g.type==='weekly'?'rgba(68,136,255,.3)':'rgba(204,68,255,.4)'}` }}>
                          {typeLabel}
                        </span>
                      </div>
                      <div className="bar-track" style={{ marginBottom:6 }}>
                        <div className="bar-fill fill-exp" style={{ width: pct+'%' }} />
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <span style={{ fontSize:13, color:'var(--text2)', fontFamily:'var(--font-mono)' }}>{g.progress} / {g.target}</span>
                        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                          <span style={{ fontSize:13, color:'var(--accent)', fontFamily:'var(--font-mono)' }}>🏆 +{reward} EXP</span>
                          {!done && <button className="btn-ghost" style={{ padding:'3px 8px', fontSize:10 }} onClick={e => tickGoal(g.id, e.clientX, e.clientY)}>+1</button>}
                          <button className="btn-icon" onClick={() => { if(confirm(t(lang,'deleteConfirm'))) deleteGoal(g.id) }}>✕</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}

          {/* ── LOGROS ──────────────────────────── */}
          {activeTab === 'achievements' && (
            <div>
              <div className="sec-head"><div className="sec-title">{t(lang,'achievements').toUpperCase()}</div></div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {ACHIEVEMENTS.map(a => {
                  const on = achievements.some(x => x.achievement_id === a.id)
                  return (
                    <div key={a.id} style={{ background:'var(--panel)', border:`1px solid ${on?'var(--accent)':'var(--border)'}`, borderRadius:8, padding:12, display:'flex', gap:10, alignItems:'flex-start', opacity: on?1:.3, filter: on?'none':'grayscale(1)', background: on?'rgba(212,255,0,.04)':'var(--panel)' }}>
                      <div style={{ fontSize:24, flexShrink:0 }}>{a.icon}</div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, marginBottom:2 }}>{lang==='en'?a.nameEn:a.name}</div>
                        <div style={{ fontSize:11, color:'var(--text2)' }}>{lang==='en'?a.descEn:a.desc}</div>
                        {on && <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--accent)', letterSpacing:1, marginTop:3 }}>DESBLOQUEADO</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── LEADERBOARD ─────────────────────── */}
          {activeTab === 'leaderboard' && <LeaderboardPage userId={userId} lang={lang} />}

          {/* ── FEED ────────────────────────────── */}
          {activeTab === 'feed' && <FeedPage userId={userId} lang={lang} />}

          {/* ── STATS ───────────────────────────── */}
          {activeTab === 'stats' && (
            <div>
              <div className="sec-head"><div className="sec-title">{t(lang,'stats').toUpperCase()}</div></div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:16 }}>
                {[
                  [profile?.total_exp||0,  lang==='en'?'Total EXP':'EXP total'],
                  [totalDone,              lang==='en'?'Habits completed':'Hábitos completados'],
                  [bestStreak,             lang==='en'?'Best streak':'Mejor racha'],
                  [profile?.goals_done||0, lang==='en'?'Goals done':'Objetivos logrados'],
                  [currentStreak,          lang==='en'?'Current streak':'Racha activa'],
                  [profile?.level||1,      lang==='en'?'Current level':'Nivel actual'],
                ].map(([val, lbl]) => (
                  <div key={lbl} style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:8, padding:'14px 12px', textAlign:'center' }}>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:28, fontWeight:700, color:'var(--accent)', lineHeight:1, marginBottom:4 }}>{val}</div>
                    <div style={{ fontSize:12, color:'var(--text3)' }}>{lbl}</div>
                  </div>
                ))}
              </div>

              {/* Level box */}
              <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:8, padding:16, marginBottom:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <span style={{ background:'var(--accent)', color:'#0c0c0c', fontFamily:'var(--font-mono)', fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, letterSpacing:1 }}>LV {profile?.level||1}</span>
                  <span style={{ fontSize:13, color:'var(--text2)' }}>{cls.displayName} · {cls.displayTitle}</span>
                </div>
                <div className="bar-track" style={{ marginBottom:6 }}>
                  <div className="bar-fill fill-exp" style={{ width: Math.min(100,((profile?.exp||0)/(profile?.exp_to_next||100))*100)+'%' }} />
                </div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text3)' }}>
                  {profile?.exp_to_next - profile?.exp} {t(lang,'expRemaining')}
                </div>
              </div>

              {/* Data export */}
              <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:8, padding:16 }}>
                <div className="sec-title" style={{ marginBottom:12, fontSize:11 }}>DATOS</div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  <button className="btn-ghost" onClick={() => {
                    const data = JSON.stringify({ profile, habits, goals, achievements }, null, 2)
                    const a = document.createElement('a')
                    a.href = URL.createObjectURL(new Blob([data],{type:'application/json'}))
                    a.download = `habitquest-${todayStr()}.json`
                    a.click()
                  }}>{t(lang,'exportData')}</button>
                </div>
              </div>
            </div>
          )}

          {/* ── PROFILE ─────────────────────────── */}
          {activeTab === 'profile' && <ProfilePage profile={profile} updateProfile={updateProfile} lang={lang} />}

        </main>
      </div>

      {/* ── Modals ──────────────────────────────── */}
      {habitModal && (
        <div className="overlay" onClick={e => e.target===e.currentTarget && setHabitModal(false)}>
          <div className="modal">
            <div className="modal-title">{t(lang,'newHabit').replace('+ ','').toUpperCase()}</div>
            <div className="form-group">
              <label className="form-label">{t(lang,'habitName').toUpperCase()}</label>
              <input ref={hNameRef} className="form-input" placeholder={t(lang,'habitNamePlaceholder')} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">{t(lang,'category').toUpperCase()}</label>
              <select ref={hCatRef} className="form-select">
                {Object.entries(t(lang,'categories')).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t(lang,'difficulty').toUpperCase()}</label>
              <div className="diff-sel">
                {['easy','normal','hard','legendary'].map(d => (
                  <div key={d} className={`diff-opt ${selDiff===d?'sel-'+d:''}`} onClick={() => setSelDiff(d)}>
                    <div className="diff-opt-name" style={{ color: DIFF_COLORS[d] }}>{t(lang,`difficulties.${d}`)}</div>
                    <div className="diff-opt-exp">+{DIFF_EXP[d]} EXP</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setHabitModal(false)}>{t(lang,'cancel')}</button>
              <button className="btn-primary" onClick={() => {
                const name = hNameRef.current?.value?.trim()
                if (!name) return
                addHabit(name, hCatRef.current?.value || 'other', selDiff)
                setHabitModal(false)
              }}>{t(lang,'addHabit').toUpperCase()}</button>
            </div>
          </div>
        </div>
      )}

      {goalModal && (
        <div className="overlay" onClick={e => e.target===e.currentTarget && setGoalModal(false)}>
          <div className="modal">
            <div className="modal-title">{t(lang,'newGoal').replace('+ ','').toUpperCase()}</div>
            <div className="form-group">
              <label className="form-label">{t(lang,'goalName').toUpperCase()}</label>
              <input ref={gNameRef} className="form-input" placeholder={t(lang,'goalNamePlaceholder')} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">{t(lang,'goalType').toUpperCase()}</label>
              <select ref={gTypeRef} className="form-select">
                <option value="weekly">{t(lang,'weeklyReward')}</option>
                <option value="monthly">{t(lang,'monthlyReward')}</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t(lang,'goalTarget').toUpperCase()}</label>
              <input ref={gTargetRef} className="form-input" type="number" defaultValue={7} min={1} max={365} />
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setGoalModal(false)}>{t(lang,'cancel')}</button>
              <button className="btn-primary" onClick={() => {
                const name = gNameRef.current?.value?.trim()
                if (!name) return
                addGoal(name, gTypeRef.current?.value || 'weekly', parseInt(gTargetRef.current?.value)||7)
                setGoalModal(false)
              }}>{t(lang,'addGoal').toUpperCase()}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toasts ── */}
      <div className="toast-wrap">
        {toasts.map(toast => (
          <div key={toast.id} className="toast">
            <div className="toast-big">{toast.big}</div>
            <div className="toast-sub">{toast.sub}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
