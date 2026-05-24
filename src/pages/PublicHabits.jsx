import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getClass } from '../lib/game'

export default function PublicHabits() {
  const { username } = useParams()
  const [profile, setProfile] = useState(null)
  const [habits, setHabits]   = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => { load() }, [username])

  async function load() {
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single()

    if (!prof) { setNotFound(true); setLoading(false); return }
    setProfile(prof)

    const { data: hab } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', prof.id)
      .order('order_idx', { ascending: true })

    if (hab) setHabits(hab)
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
  const doneCount = habits.filter(h => h.done_today).length
  const today = new Date().toLocaleDateString('es-ES', {
    weekday:'long', year:'numeric', month:'long', day:'numeric'
  })

  return (
    <div style={{ maxWidth:480, margin:'0 auto', padding:'32px 16px 60px' }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:14, fontWeight:700, color:'var(--text3)', marginBottom:24, letterSpacing:2 }}>
        ⚔ HABITQUEST
      </div>

      <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:16, padding:24, marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ fontSize:54 }}>{profile.avatar_emoji || '🧙'}</div>
          <div>
            <div style={{ fontSize:20, fontWeight:800, marginBottom:2 }}>{profile.display_name}</div>
            <div style={{ fontSize:13, color:'var(--text2)', marginBottom:8 }}>
              @{profile.username} · {cls.displayName}
            </div>
            <span style={{ background:'var(--accent)', color:'var(--accent-fg)', fontFamily:'var(--mono)', fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20 }}>
              LV {profile.level}
            </span>
          </div>
        </div>
      </div>

      <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:16, padding:'4px 20px', marginBottom:16 }}>
        <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:2, color:'var(--text3)', padding:'16px 0 10px' }}>
          MISIONES DE HOY · {doneCount}/{habits.length}
        </div>
        {habits.length === 0 ? (
          <div style={{ padding:'20px 0', color:'var(--text3)', fontSize:14 }}>Sin hábitos configurados</div>
        ) : habits.map((h, i) => (
          <div key={h.id} style={{
            display:'flex', alignItems:'center', gap:12,
            padding:'13px 0',
            borderBottom: i < habits.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{
              width:26, height:26, borderRadius:'50%', flexShrink:0,
              border: h.done_today ? 'none' : '2px solid var(--text3)',
              background: h.done_today ? 'var(--accent)' : 'transparent',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'var(--accent-fg)', fontSize:13, fontWeight:700,
            }}>
              {h.done_today ? '✓' : ''}
            </div>
            <span style={{
              fontSize:16, fontWeight:600,
              color: h.done_today ? 'var(--text3)' : 'var(--text)',
              textDecoration: h.done_today ? 'line-through' : 'none',
            }}>
              {h.name}
            </span>
          </div>
        ))}
        <div style={{ padding:'12px 0', fontSize:12, color:'var(--text3)', fontFamily:'var(--mono)', textTransform:'capitalize' }}>
          {today}
        </div>
      </div>

      <div style={{ textAlign:'center', marginTop:32 }}>
        <a href="/" style={{ color:'var(--accent)', fontFamily:'var(--mono)', fontSize:13 }}>
          ⚔ Únete a HabitQuest
        </a>
      </div>
    </div>
  )
}
