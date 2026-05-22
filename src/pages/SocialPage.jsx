import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const REACTION_EMOJIS = ['👊','🔥','💪','⚡','🎯','👑']

export default function SocialPage({ userId, lang }) {
  const [view, setView]               = useState('feed')
  const [squads, setSquads]           = useState([])
  const [activeSquadIdx, setActiveSquadIdx] = useState(0)
  const [squadLoading, setSquadLoading] = useState(true)
  const [events, setEvents]           = useState([])
  const [reactions, setReactions]     = useState({})
  const [leaderboard, setLeaderboard] = useState([])
  const [dataLoading, setDataLoading] = useState(false)
  const [squadName, setSquadName]     = useState('')
  const [joinCode, setJoinCode]       = useState('')
  const [msg, setMsg]                 = useState('')
  const [showJoinPanel, setShowJoinPanel] = useState(false)
  const squadRef = useRef(null)

  const squad = squads[activeSquadIdx] || null

  useEffect(() => {
    loadSquad()
  }, [])

  useEffect(() => {
    squadRef.current = squad
  }, [squad?.id])

  // Polling cada 30s + realtime cuando está disponible
  useEffect(() => {
    if (!squad) return

    // Polling fallback — siempre funciona
    const interval = setInterval(() => {
      loadFeed(squadRef.current?.id)
      loadLeaderboard(squadRef.current?.id)
    }, 30000)

    // Realtime — funciona si está activado en Supabase
    const channel = supabase.channel('social-' + squad.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_feed' },
        () => loadFeed(squadRef.current?.id))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' },
        () => loadLeaderboard(squadRef.current?.id))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'habit_logs' },
        () => loadLeaderboard(squadRef.current?.id))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reactions' },
        () => loadReactions())
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [squad?.id])

  async function loadSquad() {
    setSquadLoading(true)
    const { data } = await supabase
      .from('squad_members')
      .select('*, squads(*)')
      .eq('user_id', userId)

    const sqs = (data || []).map(m => m.squads).filter(Boolean)
    setSquads(sqs)
    setActiveSquadIdx(0)
    squadRef.current = sqs[0] || null
    setSquadLoading(false)

    if (sqs[0]) {
      await Promise.all([loadFeed(sqs[0].id), loadLeaderboard(sqs[0].id)])
    }
  }

  async function switchSquad(idx) {
    const sq = squads[idx]
    if (!sq) return
    setActiveSquadIdx(idx)
    squadRef.current = sq
    setEvents([])
    setLeaderboard([])
    setView('feed')
    await Promise.all([loadFeed(sq.id), loadLeaderboard(sq.id)])
  }

  async function leaveSquad(squadId) {
    if (!confirm(lang==='en' ? 'Leave this squad?' : '¿Salir de este escuadrón?')) return
    await supabase.from('squad_members').delete().eq('squad_id', squadId).eq('user_id', userId)
    setActiveSquadIdx(0)
    await loadSquad()
  }

  async function getSquadMemberIds(squadId) {
    const { data } = await supabase
      .from('squad_members')
      .select('user_id')
      .eq('squad_id', squadId)
    return data?.map(m => m.user_id) || []
  }

  async function loadFeed(squadId) {
    const sid = squadId || squad?.id
    if (!sid) return
    setDataLoading(true)

    const ids = await getSquadMemberIds(sid)
    if (!ids.length) { setDataLoading(false); return }

    const { data } = await supabase
      .from('activity_feed')
      .select('*, profiles(display_name, avatar_emoji, level, class_name)')
      .in('user_id', ids)
      .order('created_at', { ascending: false })
      .limit(50)

    if (data) setEvents(data)
    await loadReactions()
    setDataLoading(false)
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

  async function loadLeaderboard(squadId) {
    const sid = squadId || squadRef.current?.id
    if (!sid) return

    const ids = await getSquadMemberIds(sid)
    if (!ids.length) return

    // Fetch profiles fresh — total_exp is always up to date
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_emoji, level, class_name, total_exp, total_done')
      .in('id', ids)

    // Weekly exp from habit_logs (best effort — falls back to total_exp order if empty)
    const now = new Date()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    monday.setHours(0,0,0,0)

    const { data: logs } = await supabase
      .from('habit_logs')
      .select('user_id, exp_gained')
      .in('user_id', ids)
      .gte('logged_date', monday.toISOString().split('T')[0])

    const weeklyMap = {}
    logs?.forEach(l => {
      weeklyMap[l.user_id] = (weeklyMap[l.user_id] || 0) + l.exp_gained
    })

    const lb = (profiles || [])
      .map(p => ({
        ...p,
        // If habit_logs has data use it, otherwise show total_exp as fallback
        weekly_exp: weeklyMap[p.id] ?? 0,
      }))
      .sort((a, b) => b.total_exp - a.total_exp) // sort by total_exp — always accurate
      setLeaderboard(lb)
  }

  async function reactToEvent(feedId, emoji) {
    const existing = (reactions[feedId] || []).find(r => r.user_id === userId)
    if (existing) {
      await supabase.from('reactions').delete().eq('id', existing.id)
    } else {
      await supabase.from('reactions').insert({ feed_id: feedId, user_id: userId, emoji })
    }
    await loadReactions()
  }

  async function createSquad() {
    if (!squadName.trim()) return
    const code = Math.random().toString(36).substring(2,8).toUpperCase()
    const { data, error } = await supabase
      .from('squads')
      .insert({ name: squadName.trim(), code, owner_id: userId })
      .select().single()
    if (error || !data) { setMsg(lang==='en'?'Error creating squad':'Error al crear el escuadrón'); return }
    await supabase.from('squad_members').insert({ squad_id: data.id, user_id: userId })
    setMsg(`${lang==='en'?'Squad created! Code:':'¡Escuadrón creado! Código:'} ${code}`)
    await loadSquad()
  }

  async function joinSquad() {
    if (!joinCode.trim()) return
    const { data: sq } = await supabase
      .from('squads').select('*').eq('code', joinCode.trim().toUpperCase()).single()
    if (!sq) { setMsg(lang==='en'?'Code not found':'Código no encontrado'); return }
    const { error } = await supabase
      .from('squad_members').insert({ squad_id: sq.id, user_id: userId })
    if (error) { setMsg(lang==='en'?'Already in this squad':'Ya estás en este escuadrón'); return }
    setMsg(lang==='en'?`Joined ${sq.name}!`:`¡Te uniste a ${sq.name}!`)
    await loadSquad()
  }

  function timeAgo(ts) {
    const diff = Date.now() - new Date(ts).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1)  return lang==='en'?'just now':'ahora'
    if (m < 60) return `${m}m`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h`
    return `${Math.floor(h / 24)}d`
  }

  function eventText(ev) {
    const d    = ev.event_data || {}
    const name = ev.profiles?.display_name || '?'
    if (ev.event_type === 'habit_done')
      return lang==='en'
        ? `${name} completed "${d.habit_name}"${d.streak>1?` 🔥${d.streak}d`:''}`
        : `${name} completó "${d.habit_name}"${d.streak>1?` 🔥${d.streak}d`:''}`
    if (ev.event_type === 'level_up')
      return lang==='en'
        ? `${name} reached level ${d.level} — ${d.class_name} ⬆`
        : `${name} subió al nivel ${d.level} — ${d.class_name} ⬆`
    if (ev.event_type === 'achievement')
      return `${name} ${lang==='en'?'unlocked':'desbloqueó'} ${d.icon} ${d.name}`
    if (ev.event_type === 'goal_done')
      return lang==='en'
        ? `${name} completed goal "${d.goal_name}" 🎯`
        : `${name} logró el objetivo "${d.goal_name}" 🎯`
    return `${name} ${lang==='en'?'did something epic':'hizo algo épico'}`
  }

  // ── Sin escuadrón ──────────────────────────────
  if (squadLoading) return <div className="loading">...</div>

  function JoinCreatePanel() {
    return (
      <>
        <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:12, padding:18, marginBottom:12, boxShadow:'var(--shadow)' }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:11, letterSpacing:1, color:'var(--text2)', marginBottom:12 }}>
            {lang==='en'?'CREATE SQUAD':'CREAR ESCUADRÓN'}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <input className="form-input" style={{ flex:1 }}
              placeholder={lang==='en'?'Squad name e.g. "The Grind"':'Nombre ej. "Los Fieras"'}
              value={squadName} onChange={e=>{ setSquadName(e.target.value); setMsg('') }} />
            <button className="btn btn-primary" onClick={createSquad}>
              {lang==='en'?'Create':'Crear'}
            </button>
          </div>
        </div>

        <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:12, padding:18, marginBottom:12, boxShadow:'var(--shadow)' }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:11, letterSpacing:1, color:'var(--text2)', marginBottom:12 }}>
            {lang==='en'?'JOIN WITH CODE':'UNIRSE CON CÓDIGO'}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <input className="form-input"
              style={{ flex:1, fontFamily:'var(--mono)', letterSpacing:3, textTransform:'uppercase' }}
              placeholder="ABC123"
              value={joinCode} onChange={e=>{ setJoinCode(e.target.value); setMsg('') }} />
            <button className="btn btn-primary" onClick={joinSquad}>
              {lang==='en'?'Join':'Unirse'}
            </button>
          </div>
        </div>

        {msg && (
          <div style={{ background:'var(--bg3)', borderRadius:10, padding:'12px 16px', fontSize:14,
            fontWeight:600, color: msg.includes('!')?'var(--d-easy)':'var(--red)', fontFamily:'var(--mono)' }}>
            {msg}
          </div>
        )}
      </>
    )
  }

  if (squads.length === 0) return (
    <div>
      <div className="sec-head"><div className="sec-title">Social</div></div>

      <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:16, padding:28, textAlign:'center', marginBottom:16, boxShadow:'var(--shadow)' }}>
        <div style={{ fontSize:52, marginBottom:12 }}>⚔️</div>
        <div style={{ fontSize:20, fontWeight:800, marginBottom:8 }}>
          {lang==='en'?'Join a squad':'Únete a un escuadrón'}
        </div>
        <div style={{ fontSize:14, color:'var(--text2)' }}>
          {lang==='en'
            ?'Create one and share the code, or join with an existing code.'
            :'Crea uno y comparte el código, o únete con uno existente.'}
        </div>
      </div>

      {JoinCreatePanel()}
    </div>
  )

  // ── Con escuadrón ──────────────────────────────
  return (
    <div>
      {/* Tabs de múltiples squads */}
      {squads.length > 1 && (
        <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
          {squads.map((sq, i) => (
            <button key={sq.id} onClick={() => switchSquad(i)}
              style={{ padding:'6px 14px', borderRadius:20, border:'2px solid',
                borderColor: i===activeSquadIdx ? 'var(--accent)' : 'var(--border)',
                background: i===activeSquadIdx ? 'var(--accent)' : 'var(--panel)',
                color: i===activeSquadIdx ? 'var(--accent-fg)' : 'var(--text2)',
                fontFamily:'var(--font)', fontSize:13, fontWeight:700, cursor:'pointer',
                transition:'all .2s' }}>
              {sq.name}
            </button>
          ))}
        </div>
      )}

      {/* Squad header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div>
          <div style={{ fontSize:20, fontWeight:800 }}>{squad.name}</div>
          <div style={{ fontSize:12, color:'var(--text3)', fontFamily:'var(--mono)', letterSpacing:1, marginTop:2 }}>
            {lang==='en'?'CODE':'CÓDIGO'}: <span style={{ color:'var(--accent)' }}>{squad.code}</span>
            {' · '}
            <button onClick={()=>{ navigator.clipboard.writeText(squad.code); setMsg('✓'); setTimeout(()=>setMsg(''),2000) }}
              style={{ background:'none', border:'none', color:'var(--accent)', cursor:'pointer', fontFamily:'var(--mono)', fontSize:12 }}>
              {lang==='en'?'Copy':'Copiar'}
            </button>
            {msg && <span style={{ color:'var(--d-easy)', marginLeft:6 }}>{msg}</span>}
          </div>
        </div>

        {/* Feed / Ranking toggle */}
        <div style={{ display:'flex', background:'var(--bg3)', borderRadius:100, padding:4, gap:4 }}>
          {[['feed','Feed'],['ranking','Ranking']].map(([v,lbl])=>(
            <button key={v} onClick={()=>{ setView(v); if(v==='ranking') loadLeaderboard(squadRef.current?.id) }}
              style={{ padding:'7px 14px', borderRadius:100, border:'none',
                background: view===v?'var(--panel)':'transparent',
                color: view===v?'var(--text)':'var(--text3)',
                fontFamily:'var(--font)', fontSize:13, fontWeight:600, cursor:'pointer',
                transition:'all .2s', boxShadow: view===v?'var(--shadow)':'none' }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Botón refresh manual + Salir del escuadrón */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <button className="btn btn-ghost btn-sm"
          onClick={() => leaveSquad(squad.id)}
          style={{ fontSize:12, color:'var(--red)', borderColor:'var(--red)' }}>
          ✕ {lang==='en'?'Leave squad':'Salir del escuadrón'}
        </button>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button className="btn btn-ghost btn-sm"
            onClick={() => setShowJoinPanel(v => !v)}
            style={{ fontSize:12 }}>
            + {lang==='en'?'Join another':'Unirse a otro'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={()=>{ loadFeed(); loadLeaderboard() }}
            style={{ fontSize:12 }}>
            ↻ {lang==='en'?'Refresh':'Actualizar'}
          </button>
        </div>
      </div>

      {/* Panel unirse a otro escuadrón */}
      {showJoinPanel && (
        <div style={{ marginBottom:12 }}>
          {JoinCreatePanel()}
        </div>
      )}

      {dataLoading && <div className="loading" style={{ minHeight:80 }}>...</div>}

      {/* ── FEED ── */}
      {!dataLoading && view==='feed' && (
        events.length === 0
          ? <div className="empty">{lang==='en'?'No activity yet. Complete a habit!':'Sin actividad. ¡Completa un hábito!'}</div>
          : events.map(ev => {
            const evReactions = reactions[ev.id] || []
            const myReaction  = evReactions.find(r => r.user_id === userId)
            const grouped = evReactions.reduce((acc,r)=>{ acc[r.emoji]=(acc[r.emoji]||0)+1; return acc },{})

            return (
              <div key={ev.id} className="feed-card">
                <div style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:10 }}>
                  <div style={{ fontSize:24, flexShrink:0 }}>{ev.profiles?.avatar_emoji||'🧙'}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, lineHeight:1.4 }}>{eventText(ev)}</div>
                    <div style={{ fontSize:11, color:'var(--text3)', fontFamily:'var(--mono)', marginTop:3 }}>
                      {timeAgo(ev.created_at)}
                    </div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                  {REACTION_EMOJIS.map(emoji=>(
                    <button key={emoji} onClick={()=>reactToEvent(ev.id, emoji)}
                      style={{ background: myReaction?.emoji===emoji?'var(--accent)':'var(--bg3)',
                        color: myReaction?.emoji===emoji?'var(--accent-fg)':'var(--text)',
                        border:'none', borderRadius:20, padding:'4px 10px', cursor:'pointer',
                        fontSize:13, transition:'all .15s',
                        fontWeight: grouped[emoji]?600:400 }}>
                      {emoji}{grouped[emoji]?' '+grouped[emoji]:''}
                    </button>
                  ))}
                </div>
              </div>
            )
          })
      )}

      {/* ── RANKING ── */}
      {!dataLoading && view==='ranking' && (
        leaderboard.length === 0
          ? <div className="empty">{lang==='en'?'No data yet':'Sin datos aún'}</div>
          : leaderboard.map((row, i) => (
            <div key={row.id} className={`lb-row ${row.id===userId?'me':''}`}>
              <div style={{ fontFamily:'var(--mono)', fontSize:18, fontWeight:700, textAlign:'center',
                color: i===0?'var(--accent)':i===1?'var(--text2)':'var(--text3)' }}>
                {i===0?'👑':i===1?'🥈':i===2?'🥉':i+1}
              </div>
              <div style={{ fontSize:26, textAlign:'center' }}>{row.avatar_emoji||'🧙'}</div>
              <div>
                <div style={{ fontSize:15, fontWeight:700 }}>
                  {row.display_name}{row.id===userId?` (${lang==='en'?'you':'tú'})`:''}</div>
                <div style={{ fontSize:12, color:'var(--text3)' }}>Lv {row.level} · {row.class_name}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontFamily:'var(--mono)', fontSize:15, fontWeight:700, color:'var(--accent)' }}>
                  {row.total_exp?.toLocaleString()} EXP
                </div>
                <div style={{ fontSize:11, color:'var(--text3)' }}>
                  {row.weekly_exp > 0 ? `+${row.weekly_exp} ${lang==='en'?'this week':'esta semana'}` : lang==='en'?'total':'total'}
                </div>
              </div>
            </div>
          ))
      )}
    </div>
  )
}
