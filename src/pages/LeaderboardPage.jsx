import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { t } from '../i18n/translations'

export default function LeaderboardPage({ userId, lang }) {
  const [leaderboard, setLeaderboard] = useState([])
  const [requests, setRequests]       = useState([])
  const [friendEmail, setFriendEmail] = useState('')
  const [msg, setMsg]                 = useState('')
  const [loading, setLoading]         = useState(true)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: lb }, { data: req }] = await Promise.all([
      supabase.rpc('get_leaderboard', { requesting_user_id: userId }),
      supabase.from('friendships')
        .select('*, profiles!friendships_user_id_fkey(display_name, avatar_emoji)')
        .eq('friend_id', userId).eq('status', 'pending')
    ])
    if (lb)  setLeaderboard(lb)
    if (req) setRequests(req)
    setLoading(false)
  }

  async function sendFriendRequest() {
    if (!friendEmail.trim()) return
    const { data: target } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', friendEmail.trim().toLowerCase())
      .single()

    if (!target) {
      // try by email via auth (limited) — just show message
      setMsg(lang==='en' ? 'User not found. Ask them to set a username in their profile.' : 'Usuario no encontrado. Pídele que configure su nombre de usuario en su perfil.')
      return
    }
    if (target.id === userId) {
      setMsg(lang==='en' ? "You can't add yourself!" : '¡No puedes añadirte a ti mismo!'); return
    }
    const { error } = await supabase.from('friendships').insert({ user_id: userId, friend_id: target.id })
    if (error) setMsg(lang==='en' ? 'Request already sent.' : 'Solicitud ya enviada.')
    else { setMsg(lang==='en' ? 'Request sent!' : '¡Solicitud enviada!'); setFriendEmail('') }
  }

  async function acceptRequest(friendshipId) {
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId)
    // create reciprocal
    const req = requests.find(r => r.id === friendshipId)
    if (req) await supabase.from('friendships').upsert({ user_id: userId, friend_id: req.user_id, status: 'accepted' })
    await loadAll()
  }

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'var(--text3)', fontFamily:'var(--font-mono)', fontSize:12, letterSpacing:2 }}>CARGANDO...</div>

  return (
    <div>
      <div className="sec-head">
        <div className="sec-title">{t(lang,'leaderboardTitle').toUpperCase()}</div>
      </div>

      {/* Leaderboard */}
      <div style={{ marginBottom:20 }}>
        {leaderboard.length === 0
          ? <div className="empty">{lang==='en'?'Add friends to see the leaderboard':'Añade amigos para ver el ranking'}</div>
          : leaderboard.map((row, i) => (
            <div key={row.user_id} style={{ background: row.user_id===userId ? 'rgba(212,255,0,.05)' : 'var(--panel)', border: `1px solid ${row.user_id===userId?'var(--accent)':'var(--border)'}`, borderRadius:8, padding:'12px 16px', marginBottom:8, display:'grid', gridTemplateColumns:'32px 40px 1fr auto', gap:12, alignItems:'center' }}>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:18, fontWeight:700, color: i===0?'var(--accent)': i===1?'var(--text2)':'var(--text3)', textAlign:'center' }}>
                {i===0?'👑':i===1?'🥈':i===2?'🥉':i+1}
              </div>
              <div style={{ fontSize:28, textAlign:'center' }}>{row.avatar_emoji||'🧙'}</div>
              <div>
                <div style={{ fontSize:15, fontWeight:600 }}>{row.display_name}{row.user_id===userId?' (tú)':''}</div>
                <div style={{ fontSize:12, color:'var(--text3)' }}>Lv {row.level} · {row.class_name}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:15, fontWeight:700, color:'var(--accent)' }}>{row.weekly_exp} EXP</div>
                <div style={{ fontSize:11, color:'var(--text3)', fontFamily:'var(--font-mono)' }}>🔥 {row.best_streak}d</div>
              </div>
            </div>
          ))}
      </div>

      {/* Pending requests */}
      {requests.length > 0 && (
        <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:8, padding:14, marginBottom:16 }}>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:11, letterSpacing:1, color:'var(--text2)', marginBottom:10 }}>
            {t(lang,'friendRequests').toUpperCase()}
          </div>
          {requests.map(r => (
            <div key={r.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
              <span style={{ fontSize:14 }}>{r.profiles?.display_name || 'Alguien'} {r.profiles?.avatar_emoji}</span>
              <button className="btn-primary" style={{ padding:'5px 12px', fontSize:11 }} onClick={() => acceptRequest(r.id)}>
                {t(lang,'accept')}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add friend */}
      <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:8, padding:16 }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:11, letterSpacing:1, color:'var(--text2)', marginBottom:10 }}>
          {t(lang,'addFriend').toUpperCase()}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <input className="form-input" style={{ flex:1 }} placeholder={lang==='en'?"Friend's username":'Username del amigo'}
            value={friendEmail} onChange={e => { setFriendEmail(e.target.value); setMsg('') }} />
          <button className="btn-primary" onClick={sendFriendRequest}>{t(lang,'sendRequest')}</button>
        </div>
        {msg && <div style={{ fontSize:13, color: msg.includes('!')||msg.includes('sent')||msg.includes('enviada') ? 'var(--green)' : 'var(--red)', marginTop:8 }}>{msg}</div>}
        <div style={{ fontSize:12, color:'var(--text3)', marginTop:8, fontStyle:'italic' }}>
          {lang==='en' ? 'Use the username they set in their profile (e.g. "carlos")' : 'Usa el username que han configurado en su perfil (ej: "carlos")'}
        </div>
      </div>
    </div>
  )
}
