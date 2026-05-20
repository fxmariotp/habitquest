import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { t } from '../i18n/translations'

const REACTION_EMOJIS = ['👊','🔥','💪','⚡','🎯','👑']

export default function FeedPage({ userId, lang }) {
  const [events, setEvents] = useState([])
  const [reactions, setReactions] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFeed()
    // Realtime subscription
    const sub = supabase.channel('feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_feed' }, () => loadFeed())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reactions' }, () => loadReactions())
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [])

  async function loadFeed() {
    const { data } = await supabase
      .from('activity_feed')
      .select('*, profiles(display_name, avatar_emoji, level, class_name)')
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setEvents(data)
    await loadReactions()
    setLoading(false)
  }

  async function loadReactions() {
    const { data } = await supabase.from('reactions').select('*')
    if (!data) return
    const grouped = {}
    data.forEach(r => {
      if (!grouped[r.feed_id]) grouped[r.feed_id] = []
      grouped[r.feed_id].push(r)
    })
    setReactions(grouped)
  }

  async function react(feedId, emoji) {
    const existing = (reactions[feedId] || []).find(r => r.user_id === userId)
    if (existing) {
      await supabase.from('reactions').delete().eq('id', existing.id)
    } else {
      await supabase.from('reactions').insert({ feed_id: feedId, user_id: userId, emoji })
    }
    await loadReactions()
  }

  function eventText(event) {
    const d = event.event_data || {}
    const name = event.profiles?.display_name || 'Alguien'
    if (event.event_type === 'habit_done')
      return `${name} completó "${d.habit_name}" ${d.streak>0?`(racha: ${d.streak}d)`:''}`
    if (event.event_type === 'level_up')
      return `${name} subió al nivel ${d.level} — ${d.class_name}! ⬆`
    if (event.event_type === 'achievement')
      return `${name} desbloqueó el logro ${d.icon} ${d.name}`
    if (event.event_type === 'goal_done')
      return `${name} completó el objetivo "${d.goal_name}"`
    return `${name} hizo algo épico`
  }

  function timeAgo(ts) {
    const diff = Date.now() - new Date(ts).getTime()
    const m = Math.floor(diff/60000)
    if (m < 1)  return 'ahora'
    if (m < 60) return `${m}m`
    const h = Math.floor(m/60)
    if (h < 24) return `${h}h`
    return `${Math.floor(h/24)}d`
  }

  function eventIcon(type) {
    return { habit_done:'✅', level_up:'⬆️', achievement:'🏆', goal_done:'🎯' }[type] || '⭐'
  }

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'var(--text3)', fontFamily:'var(--font-mono)', fontSize:12, letterSpacing:2 }}>CARGANDO...</div>

  return (
    <div>
      <div className="sec-head">
        <div className="sec-title">{t(lang,'feedTitle').toUpperCase()}</div>
      </div>

      {events.length === 0
        ? <div className="empty">{t(lang,'noFeed')}</div>
        : events.map(ev => {
          const evReactions = reactions[ev.id] || []
          const myReaction  = evReactions.find(r => r.user_id === userId)
          const grouped = evReactions.reduce((acc, r) => {
            acc[r.emoji] = (acc[r.emoji]||0) + 1; return acc
          }, {})

          return (
            <div key={ev.id} style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:8, padding:'12px 14px', marginBottom:8 }}>
              <div style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:8 }}>
                <div style={{ fontSize:22, flexShrink:0 }}>{ev.profiles?.avatar_emoji || '🧙'}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, color:'var(--text)', lineHeight:1.4 }}>
                    {eventIcon(ev.event_type)} {eventText(ev)}
                  </div>
                  <div style={{ fontSize:11, color:'var(--text3)', fontFamily:'var(--font-mono)', marginTop:3 }}>{timeAgo(ev.created_at)}</div>
                </div>
              </div>

              {/* Reactions */}
              <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                {REACTION_EMOJIS.map(emoji => (
                  <button key={emoji} onClick={() => react(ev.id, emoji)}
                    style={{ background: myReaction?.emoji===emoji ? 'rgba(212,255,0,.12)' : 'var(--bg3)', border: `1px solid ${myReaction?.emoji===emoji?'var(--accent)':'var(--border)'}`, borderRadius:20, padding:'3px 8px', cursor:'pointer', fontSize:13, color:'var(--text)', transition:'all .15s' }}>
                    {emoji} {grouped[emoji]||''}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
    </div>
  )
}
