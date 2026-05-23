import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getClass, ACHIEVEMENTS } from '../lib/game'

export default function PublicProfile() {
  const { username } = useParams()
  const [profile, setProfile]           = useState(null)
  const [achievements, setAchievements] = useState([])
  const [loading, setLoading]           = useState(true)
  const [notFound, setNotFound]         = useState(false)

  useEffect(() => {
    load()
  }, [username])

  async function load() {
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single()

    if (!prof) { setNotFound(true); setLoading(false); return }
    setProfile(prof)

    const { data: ach } = await supabase
      .from('achievements')
      .select('*')
      .eq('user_id', prof.id)

    if (ach) setAchievements(ach)
    setLoading(false)
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--mono)', color:'var(--text3)', letterSpacing:2 }}>
      LOADING...
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12 }}>
      <div style={{ fontSize:48 }}>😶</div>
      <div style={{ fontFamily:'var(--mono)', fontSize:18, fontWeight:700 }}>Héroe no encontrado</div>
      <div style={{ color:'var(--text3)' }}>El username <strong>@{username}</strong> no existe</div>
      <a href="/" style={{ marginTop:12, color:'var(--accent)', fontFamily:'var(--mono)', fontSize:13 }}>← Volver a HabitQuest</a>
    </div>
  )

  const cls = getClass(profile.level || 1)
  const expPct = Math.min(100, ((profile.exp||0) / (profile.exp_to_next||100)) * 100)
  const unlockedAch = ACHIEVEMENTS.filter(a => achievements.some(x => x.achievement_id === a.id))

  return (
    <div style={{ maxWidth:480, margin:'0 auto', padding:'32px 16px 60px' }}>
      {/* Header */}
      <div style={{ fontFamily:'var(--mono)', fontSize:14, fontWeight:700, color:'var(--text3)', marginBottom:24, letterSpacing:2 }}>
        ⚔ HABITQUEST
      </div>

      {/* Profile card */}
      <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:16, padding:24, marginBottom:16, textAlign:'center' }}>
        <div style={{ width:88, height:88, borderRadius:'50%', margin:'0 auto 12px',
          border:`3px solid ${profile.avatar_color || '#4DABF7'}`,
          boxShadow:`0 0 16px ${profile.avatar_color || '#4DABF7'}66`,
          background:'var(--bg3)', display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:52 }}>
          {profile.avatar_emoji || '🧙'}
        </div>
        <div style={{ fontSize:24, fontWeight:800, marginBottom:4 }}>{profile.display_name}</div>
        <div style={{ fontSize:14, color:'var(--text2)', marginBottom:16 }}>
          {cls.displayName} · {cls.displayTitle}
        </div>

        {/* Level bar */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
          <span style={{ background:'var(--accent)', color:'var(--accent-fg)', fontFamily:'var(--mono)', fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, whiteSpace:'nowrap' }}>
            LV {profile.level}
          </span>
          <div style={{ flex:1, height:6, background:'var(--bg3)', borderRadius:3, overflow:'hidden' }}>
            <div style={{ height:'100%', width:expPct+'%', background:'var(--accent)', borderRadius:3, transition:'width .6s' }} />
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
          {[
            ['⚡', profile.total_exp||0, 'EXP total'],
            ['✅', profile.total_done||0, 'Hábitos'],
            ['🏆', achievements.length, 'Logros'],
          ].map(([icon, val, lbl]) => (
            <div key={lbl} style={{ background:'var(--bg3)', borderRadius:10, padding:'10px 6px' }}>
              <div style={{ fontSize:20 }}>{icon}</div>
              <div style={{ fontFamily:'var(--mono)', fontSize:18, fontWeight:700, lineHeight:1.2 }}>{val}</div>
              <div style={{ fontSize:11, color:'var(--text3)' }}>{lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* RPG Stats */}
      <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:12, padding:16, marginBottom:16 }}>
        <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:2, color:'var(--text3)', marginBottom:12 }}>ATRIBUTOS</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
          {[['STR',profile.stat_str],['VIT',profile.stat_vit],['INT',profile.stat_int],
            ['DIS',profile.stat_dis],['AGI',profile.stat_agi],['SAB',profile.stat_wis]].map(([n,v])=>(
            <div key={n} style={{ background:'var(--bg3)', borderRadius:8, padding:'8px 6px', textAlign:'center' }}>
              <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:1, color:'var(--text3)', marginBottom:2 }}>{n}</div>
              <div style={{ fontSize:20, fontWeight:800 }}>{v||1}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Logros */}
      {unlockedAch.length > 0 && (
        <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:12, padding:16 }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:2, color:'var(--text3)', marginBottom:12 }}>LOGROS</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {unlockedAch.map(a => (
              <div key={a.id} title={a.name} style={{ fontSize:24, background:'var(--bg3)', borderRadius:8, width:44, height:44, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {a.icon}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ textAlign:'center', marginTop:32 }}>
        <a href="/" style={{ color:'var(--accent)', fontFamily:'var(--mono)', fontSize:13 }}>
          ⚔ Únete a HabitQuest
        </a>
      </div>
    </div>
  )
}
