import { getClass, POWERUPS } from '../lib/game'
import { t } from '../i18n/translations'
import { useEffect, useRef } from 'react'

export default function Sidebar({ profile, habits, lang }) {
  const kiRef = useRef(null)
  if (!profile) return null

  const level  = profile.level || 1
  const cls    = getClass(level, lang)
  const expPct = Math.min(100, ((profile.exp||0) / (profile.exp_to_next||100)) * 100)
  const hpPct  = Math.min(100, ((profile.hp||100) / (profile.max_hp||100)) * 100)
  const mpPct  = Math.min(100, ((profile.mp||0) / (profile.max_mp||50)) * 100)

  let auraClass = ''
  if (level >= 20)      auraClass = 'aura-purple'
  else if (level >= 14) auraClass = 'aura-orange'
  else if (level >= 10) auraClass = 'aura-blue'
  else if (level >= 7)  auraClass = 'aura-green'
  else if (level >= 3)  auraClass = 'aura-gold'

  useEffect(() => {
    const wrap = kiRef.current; if (!wrap) return
    wrap.innerHTML = ''
    if (level < 5) return
    const colors = ['#d4ff00','#4488ff','#cc44ff','#44ff88']
    for (let i = 0; i < 8; i++) {
      const p = document.createElement('div')
      p.style.cssText = `position:absolute;width:${3+Math.random()*3}px;height:${3+Math.random()*3}px;border-radius:50%;background:${colors[i%4]};box-shadow:0 0 5px ${colors[i%4]};animation:kiO${i} ${1.8+Math.random()*1.5}s linear infinite;`
      wrap.appendChild(p)
    }
    if (!document.getElementById('ki-kf')) {
      const s = document.createElement('style'); s.id='ki-kf'; let kf=''
      for (let i=0;i<8;i++){const a=(i/8)*360,r=50+i*3;kf+=`@keyframes kiO${i}{0%{transform:rotate(${a}deg) translateX(${r}px);opacity:.8}50%{transform:rotate(${a+180}deg) translateX(${r+4}px);opacity:1}100%{transform:rotate(${a+360}deg) translateX(${r}px);opacity:.8}}`}
      s.textContent=kf; document.head.appendChild(s)
    }
  }, [level])

  return (
    <div className="sidebar">
      {/* Avatar */}
      <div className="avatar-wrap">
        {auraClass && <div className={`aura-ring aura-on ${auraClass}`} />}
        <div ref={kiRef} style={{ position:'absolute', inset:-20, borderRadius:'50%', pointerEvents:'none', zIndex:3 }} />
        <div className="avatar-circle">{profile.avatar_emoji || '🧙'}</div>
      </div>

      <div className="char-name">{profile.display_name || 'Hero'}</div>
      <div className="char-sub">{cls.displayName} · {cls.displayTitle}</div>

      {/* Bars */}
      {[
        { lbl:'EXP', pct:expPct, cls:'fill-exp', val:`${profile.exp}/${profile.exp_to_next}` },
        { lbl:'HP',  pct:hpPct,  cls:'fill-hp',  val:`${profile.hp}/${profile.max_hp}` },
        { lbl:'KI',  pct:mpPct,  cls:'fill-mp',  val:`${profile.mp}/${profile.max_mp}` },
      ].map(b => (
        <div key={b.lbl} className="bar-row">
          <span className="bar-lbl" style={{ color: b.cls==='fill-exp'?'var(--accent)': b.cls==='fill-hp'?'#ff4444':'#4488ff' }}>{b.lbl}</span>
          <div className="bar-track"><div className={`bar-fill ${b.cls}`} style={{ width:b.pct+'%' }} /></div>
          <span className="bar-val">{b.val}</span>
        </div>
      ))}

      {/* Stats */}
      <div className="rpg-grid">
        {[['STR',profile.stat_str],['VIT',profile.stat_vit],['INT',profile.stat_int],
          ['DIS',profile.stat_dis],['AGI',profile.stat_agi],['SAB',profile.stat_wis]].map(([n,v])=>(
          <div key={n} className="rpg-box">
            <div className="rpg-box-lbl">{n}</div>
            <div className="rpg-box-val">{v||1}</div>
          </div>
        ))}
      </div>

      {/* Powers */}
      <div className="pw-section">
        <div className="pw-label">PODERES</div>
        <div className="pw-list">
          {POWERUPS.map(p => (
            <div key={p.id} className={`pw-badge ${level>=p.lv?'on':'locked'}`}
              title={level>=p.lv?(lang==='en'?p.nameEn:p.name):`Lv ${p.lv}`}>
              {p.icon} {lang==='en'?p.nameEn:p.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
