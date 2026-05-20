import { getClass, POWERUPS, streakIcon } from '../lib/game'
import { t } from '../i18n/translations'
import { useEffect, useRef } from 'react'

export default function Sidebar({ profile, habits, lang }) {
  const kiRef = useRef(null)
  if (!profile) return null

  const level     = profile.level || 1
  const cls       = getClass(level, lang)
  const expPct    = Math.min(100, ((profile.exp || 0) / (profile.exp_to_next || 100)) * 100)
  const hpPct     = Math.min(100, ((profile.hp || 100) / (profile.max_hp || 100)) * 100)
  const mpPct     = Math.min(100, ((profile.mp || 0) / (profile.max_mp || 50)) * 100)
  const maxStreak = Math.max(0, ...habits.map(h => Math.max(h.streak || 0, h.best_streak || 0)))

  // Pick aura class
  let auraClass = ''
  if (level >= 20)      auraClass = 'aura-purple'
  else if (level >= 14) auraClass = 'aura-orange'
  else if (level >= 10) auraClass = 'aura-blue'
  else if (level >= 7)  auraClass = 'aura-green'
  else if (level >= 3)  auraClass = 'aura-gold'

  // Ki particles
  useEffect(() => {
    const wrap = kiRef.current
    if (!wrap) return
    wrap.innerHTML = ''
    if (level < 5) return
    const colors = ['#d4ff00','#4488ff','#cc44ff','#44ff88']
    for (let i = 0; i < 8; i++) {
      const p = document.createElement('div')
      p.style.cssText = `position:absolute;width:${3+Math.random()*3}px;height:${3+Math.random()*3}px;border-radius:50%;background:${colors[i%4]};box-shadow:0 0 5px ${colors[i%4]};animation:kiO${i} ${1.8+Math.random()*1.5}s linear infinite;`
      wrap.appendChild(p)
    }
    // inject keyframes once
    if (!document.getElementById('ki-kf')) {
      const s = document.createElement('style'); s.id = 'ki-kf'; let kf = ''
      for (let i = 0; i < 8; i++) {
        const a = (i/8)*360, r = 55 + i*3
        kf += `@keyframes kiO${i}{0%{transform:rotate(${a}deg) translateX(${r}px) scale(1);opacity:.8}50%{transform:rotate(${a+180}deg) translateX(${r+4}px) scale(1.4);opacity:1}100%{transform:rotate(${a+360}deg) translateX(${r}px) scale(1);opacity:.8}}`
      }
      s.textContent = kf; document.head.appendChild(s)
    }
  }, [level])

  return (
    <aside style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:10, padding:20, position:'sticky', top:16 }}>

      {/* Avatar */}
      <div style={{ position:'relative', width:100, height:100, margin:'0 auto 16px' }}>
        {auraClass && <div className={`aura-ring ${auraClass}`} />}
        <div ref={kiRef} style={{ position:'absolute', inset:-22, borderRadius:'50%', pointerEvents:'none', zIndex:3 }} />
        <div style={{ width:100, height:100, borderRadius:'50%', background:'var(--bg3)', border:'2px solid var(--border2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:44, position:'relative', zIndex:2 }}>
          {profile.avatar_emoji || '🧙'}
        </div>
      </div>

      <div style={{ fontFamily:'var(--font-mono)', fontSize:16, fontWeight:700, color:'var(--accent)', textAlign:'center', marginBottom:2 }}>
        {profile.display_name || 'Hero'}
      </div>
      <div style={{ textAlign:'center', fontSize:12, color:'var(--text3)', marginBottom:2 }}>
        {cls.displayTitle}
      </div>
      <div style={{ textAlign:'center', fontSize:13, color:'var(--text2)', marginBottom:18 }}>
        {t(lang,'class')}: {cls.displayName}
      </div>

      {/* Bars */}
      {[
        { lbl: t(lang,'exp'), color:'var(--accent)', pct: expPct, val:`${profile.exp}/${profile.exp_to_next}` },
        { lbl: t(lang,'hp'),  color:'var(--red)',    pct: hpPct,  val:`${profile.hp}/${profile.max_hp}` },
        { lbl: t(lang,'mp'),  color:'var(--blue)',   pct: mpPct,  val:`${profile.mp}/${profile.max_mp}` },
      ].map(({ lbl, color, pct, val }) => (
        <div key={lbl} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:10, fontWeight:700, color, width:30, flexShrink:0, letterSpacing:1 }}>{lbl}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: pct+'%', background: color }} />
          </div>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text2)', width:50, textAlign:'right', flexShrink:0 }}>{val}</span>
        </div>
      ))}

      {/* RPG Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, margin:'14px 0' }}>
        {[
          ['STR', profile.stat_str], ['VIT', profile.stat_vit], ['INT', profile.stat_int],
          ['DIS', profile.stat_dis], ['AGI', profile.stat_agi], [t(lang,'wis'), profile.stat_wis],
        ].map(([name, val]) => (
          <div key={name} style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'8px 6px', textAlign:'center' }}>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:8, letterSpacing:1, color:'var(--text3)', marginBottom:3 }}>{name}</div>
            <div style={{ fontSize:20, fontWeight:700 }}>{val || 1}</div>
          </div>
        ))}
      </div>

      {/* Powerups */}
      <div style={{ borderTop:'1px solid var(--border)', paddingTop:12 }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:9, letterSpacing:2, color:'var(--text3)', marginBottom:8 }}>{t(lang,'powers').toUpperCase()}</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
          {POWERUPS.map(p => {
            const on = level >= p.lv
            return (
              <div key={p.id} title={on ? (lang==='en'?p.nameEn:p.name) : `Lv ${p.lv}`}
                style={{ fontSize:12, padding:'3px 9px', borderRadius:20, border:'1px solid var(--border)', color: on ? 'var(--accent)' : 'var(--text3)', background: on ? 'rgba(212,255,0,.07)' : 'transparent', boxShadow: on ? '0 0 6px rgba(212,255,0,.2)' : 'none', opacity: on ? 1 : .25 }}>
                {p.icon} {lang==='en' ? p.nameEn : p.name}
              </div>
            )
          })}
        </div>
      </div>
    </aside>
  )
}
