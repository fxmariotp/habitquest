import { getClass } from '../lib/game'

export default function Sidebar({ profile, habits, lang }) {
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

  return (
    <div className="sidebar">
      {/* Avatar */}
      <div className="avatar-wrap">
        {auraClass && <div className={`aura-ring aura-on ${auraClass}`} />}
        <div className="avatar-circle">{profile.avatar_emoji || '🧙'}</div>
      </div>

      <div className="char-name">{profile.display_name || 'Hero'}</div>
      <div className="char-sub">{cls.displayName} · {cls.displayTitle}</div>

      {/* Barras */}
      {[
        { lbl:'EXP', pct:expPct, cls:'fill-exp', color:'var(--accent)', val:`${profile.exp}/${profile.exp_to_next}` },
        { lbl:'HP',  pct:hpPct,  cls:'fill-hp',  color:'#ff4444',       val:`${profile.hp}/${profile.max_hp}` },
        { lbl:'KI',  pct:mpPct,  cls:'fill-mp',  color:'#4488ff',       val:`${profile.mp}/${profile.max_mp}` },
      ].map(b => (
        <div key={b.lbl} className="bar-row">
          <span className="bar-lbl" style={{ color: b.color }}>{b.lbl}</span>
          <div className="bar-track">
            <div className={`bar-fill ${b.cls}`} style={{ width: b.pct+'%' }} />
          </div>
          <span className="bar-val">{b.val}</span>
        </div>
      ))}

      {/* Stats RPG */}
      <div className="rpg-grid">
        {[['STR',profile.stat_str],['VIT',profile.stat_vit],['INT',profile.stat_int],
          ['DIS',profile.stat_dis],['AGI',profile.stat_agi],['SAB',profile.stat_wis]].map(([n,v])=>(
          <div key={n} className="rpg-box">
            <div className="rpg-box-lbl">{n}</div>
            <div className="rpg-box-val">{v||1}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
