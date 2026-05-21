import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const REWARD_EMOJIS = ['🎁','🍕','🎬','🏖️','🎮','🍣','🛁','🎯','🏋️','📚','🎸','✈️','🍰','🥂','🎪','🛍️','🎨','🏊','🚴','🎭']

const PRESETS = {
  es: [
    { name:'Cena fuera',          emoji:'🍕', exp_cost:300  },
    { name:'Tarde de ocio',       emoji:'🎮', exp_cost:200  },
    { name:'Peli en el cine',     emoji:'🎬', exp_cost:150  },
    { name:'Día de playa',        emoji:'🏖️', exp_cost:500  },
    { name:'Capricho de ropa',    emoji:'🛍️', exp_cost:800  },
    { name:'Fin de semana libre', emoji:'✈️', exp_cost:1500 },
  ],
  en: [
    { name:'Dinner out',          emoji:'🍕', exp_cost:300  },
    { name:'Leisure afternoon',   emoji:'🎮', exp_cost:200  },
    { name:'Cinema night',        emoji:'🎬', exp_cost:150  },
    { name:'Beach day',           emoji:'🏖️', exp_cost:500  },
    { name:'Shopping treat',      emoji:'🛍️', exp_cost:800  },
    { name:'Free weekend',        emoji:'✈️', exp_cost:1500 },
  ],
}

export default function RewardsPage({ profile, lang, onExpSpent }) {
  const [rewards, setRewards]   = useState([])
  const [spentExp, setSpentExp] = useState(0)  // EXP gastada en recompensas esta semana
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [selEmoji, setSelEmoji] = useState('🎁')
  const [confirm, setConfirm]   = useState(null)
  const [recentRedeem, setRecentRedeem] = useState(null) // para mostrar celebración
  const nameRef = useRef(); const descRef = useRef(); const expRef = useRef()

  const totalExp    = profile?.total_exp || 0
  const availableExp = Math.max(0, totalExp - spentExp) // EXP disponible para gastar

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)

    // Cargar recompensas definidas
    const { data: rData } = await supabase
      .from('rewards')
      .select('*')
      .eq('user_id', profile.id)
      .order('exp_cost', { ascending: true })

    // Cargar EXP gastada en recompensas (suma de todos los canjes)
    const { data: logs } = await supabase
      .from('reward_logs')
      .select('exp_cost')
      .eq('user_id', profile.id)

    const spent = logs?.reduce((acc, l) => acc + (l.exp_cost || 0), 0) || 0

    if (rData) setRewards(rData)
    setSpentExp(spent)
    setLoading(false)
  }

  async function addReward(name, description, exp_cost, emoji) {
    const { data, error } = await supabase.from('rewards').insert({
      user_id: profile.id, name, description, exp_cost, emoji
    }).select().single()
    if (!error && data) setRewards(r => [...r, data].sort((a,b) => a.exp_cost - b.exp_cost))
  }

  async function addPreset(preset) {
    // Evitar duplicados
    if (rewards.some(r => r.name === preset.name)) return
    const { data, error } = await supabase.from('rewards').insert({
      user_id: profile.id, name: preset.name, emoji: preset.emoji, exp_cost: preset.exp_cost
    }).select().single()
    if (!error && data) setRewards(r => [...r, data].sort((a,b) => a.exp_cost - b.exp_cost))
  }

  async function doRedeem(reward) {
    // Gastar EXP (se resta del pool de recompensas, no de niveles)
    const { error } = await supabase.from('reward_logs').insert({
      user_id:     profile.id,
      reward_id:   reward.id,
      reward_name: reward.name,
      emoji:       reward.emoji,
      exp_cost:    reward.exp_cost,
    })
    if (error) { console.error(error); return }

    setSpentExp(s => s + reward.exp_cost)
    setConfirm(null)
    setRecentRedeem(reward)
    setTimeout(() => setRecentRedeem(null), 3000)
  }

  async function deleteReward(id) {
    if (!window.confirm(lang==='en'?'Delete this reward?':'¿Eliminar esta recompensa?')) return
    await supabase.from('rewards').delete().eq('id', id)
    setRewards(rs => rs.filter(r => r.id !== id))
  }

  if (loading) return <div className="loading">...</div>

  const unlocked = rewards.filter(r => availableExp >= r.exp_cost)
  const locked   = rewards.filter(r => availableExp < r.exp_cost)
  // Presets que aún no tiene el usuario
  const missingPresets = (PRESETS[lang] || PRESETS.es).filter(
    p => !rewards.some(r => r.name === p.name)
  )

  return (
    <div>
      <div className="sec-head">
        <div className="sec-title">{lang==='en'?'Rewards':'Recompensas'}</div>
        <button className="btn btn-primary" onClick={() => { setModal(true); setSelEmoji('🎁') }}>
          + {lang==='en'?'New':'Nueva'}
        </button>
      </div>

      {/* Celebración al canjear */}
      {recentRedeem && (
        <div style={{ background:'var(--accent)', color:'var(--accent-fg)', borderRadius:'var(--r)', padding:'14px 18px', marginBottom:14, display:'flex', gap:12, alignItems:'center', animation:'slideIn .3s ease' }}>
          <span style={{ fontSize:32 }}>{recentRedeem.emoji}</span>
          <div>
            <div style={{ fontWeight:800, fontSize:16 }}>
              {lang==='en'?'Enjoy it! 🎉':'¡A disfrutarlo! 🎉'}
            </div>
            <div style={{ fontSize:13, opacity:.8 }}>
              {recentRedeem.name} · -{recentRedeem.exp_cost} EXP {lang==='en'?'spent':'gastada'}
            </div>
          </div>
        </div>
      )}

      {/* EXP disponible */}
      <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'16px 20px', marginBottom:16, boxShadow:'var(--shadow)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:2, color:'var(--text3)', marginBottom:4 }}>
              {lang==='en'?'EXP AVAILABLE FOR REWARDS':'EXP DISPONIBLE PARA RECOMPENSAS'}
            </div>
            <div style={{ fontFamily:'var(--mono)', fontSize:30, fontWeight:700, color:'var(--accent)' }}>
              {availableExp.toLocaleString()}
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--text3)', marginBottom:4 }}>TOTAL</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:16, color:'var(--text2)' }}>{totalExp.toLocaleString()}</div>
            {spentExp > 0 && (
              <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--red)', marginTop:2 }}>-{spentExp.toLocaleString()} {lang==='en'?'spent':'gastada'}</div>
            )}
          </div>
        </div>
        <div style={{ fontSize:12, color:'var(--text3)', marginTop:8 }}>
          {lang==='en'
            ?'EXP spent on rewards doesn\'t affect your level — only your reward balance.'
            :'La EXP gastada en recompensas no afecta tu nivel, solo tu saldo de recompensas.'}
        </div>
      </div>

      {/* Quick add presets si faltan */}
      {missingPresets.length > 0 && rewards.length < 3 && (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:2, color:'var(--text3)', marginBottom:10 }}>
            {lang==='en'?'QUICK ADD':'AÑADIR RÁPIDO'}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {missingPresets.map(p => (
              <button key={p.name} onClick={() => addPreset(p)}
                style={{ background:'var(--panel)', border:'1.5px dashed var(--border2)', borderRadius:'var(--r)', padding:'12px 14px', cursor:'pointer', textAlign:'left', transition:'all .15s', display:'flex', gap:10, alignItems:'center' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border2)'}>
                <span style={{ fontSize:24 }}>{p.emoji}</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:600 }}>{p.name}</div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--accent)' }}>{p.exp_cost} EXP</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Desbloqueadas */}
      {unlocked.length > 0 && (
        <div style={{ marginBottom:8 }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:2, color:'var(--d-easy)', marginBottom:10 }}>
            ✓ {lang==='en'?'AVAILABLE':'DISPONIBLES'} ({unlocked.length})
          </div>
          {unlocked.map(r => (
            <div key={r.id} style={{ background:'var(--panel)', border:'1.5px solid var(--accent)', borderRadius:'var(--r)', padding:'16px 18px', marginBottom:10, boxShadow:'0 0 16px rgba(212,255,0,.07)' }}>
              <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:12 }}>
                <span style={{ fontSize:32 }}>{r.emoji}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:16, fontWeight:700 }}>{r.name}</div>
                  {r.description && <div style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>{r.description}</div>}
                  <div style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--accent)', marginTop:3 }}>
                    {r.exp_cost.toLocaleString()} EXP
                  </div>
                </div>
                <button className="btn-icon" onClick={() => deleteReward(r.id)}>✕</button>
              </div>
              <button onClick={() => setConfirm(r)}
                style={{ width:'100%', padding:'11px', borderRadius:'var(--r-sm)', border:'none', background:'var(--accent)', color:'var(--accent-fg)', fontFamily:'var(--font)', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                🎉 {lang==='en'?'Redeem':'Canjear'} ({r.exp_cost} EXP)
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Bloqueadas */}
      {locked.length > 0 && (
        <div>
          <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:2, color:'var(--text3)', marginBottom:10 }}>
            🔒 {lang==='en'?'LOCKED':'BLOQUEADAS'} ({locked.length})
          </div>
          {locked.map(r => {
            const pct     = Math.min(100, (availableExp / r.exp_cost) * 100)
            const missing = r.exp_cost - availableExp
            return (
              <div key={r.id} style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'16px 18px', marginBottom:10, boxShadow:'var(--shadow)', opacity:.7 }}>
                <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:10 }}>
                  <span style={{ fontSize:32, filter:'grayscale(.6)' }}>{r.emoji}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:16, fontWeight:700 }}>{r.name}</div>
                    {r.description && <div style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>{r.description}</div>}
                    <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text3)', marginTop:3 }}>
                      {lang==='en'?`${missing.toLocaleString()} EXP more needed`:`Faltan ${missing.toLocaleString()} EXP`}
                    </div>
                  </div>
                  <button className="btn-icon" onClick={() => deleteReward(r.id)}>✕</button>
                </div>
                <div style={{ height:6, background:'var(--bg3)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:pct+'%', background:'var(--accent)', borderRadius:3, opacity:.4, transition:'width .6s' }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {rewards.length === 0 && missingPresets.length === 0 && (
        <div className="empty">{lang==='en'?'No rewards yet.':'Sin recompensas aún.'}</div>
      )}

      {/* Modal nueva recompensa */}
      {modal && (
        <div className="overlay" onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-handle"/>
            <div className="modal-title">{lang==='en'?'New Reward':'Nueva recompensa'}</div>
            <div className="form-group">
              <label className="form-label">Emoji</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {REWARD_EMOJIS.map(e => (
                  <button key={e} onClick={() => setSelEmoji(e)}
                    style={{ fontSize:22, width:40, height:40, borderRadius:8, border:`2px solid ${selEmoji===e?'var(--accent)':'var(--border)'}`, background:selEmoji===e?'rgba(212,255,0,.08)':'var(--bg3)', cursor:'pointer', transition:'all .15s' }}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{lang==='en'?'Name':'Nombre'}</label>
              <input ref={nameRef} className="form-input" placeholder={lang==='en'?'e.g. Dinner out':'ej. Cena fuera'} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">{lang==='en'?'Description (optional)':'Descripción (opcional)'}</label>
              <input ref={descRef} className="form-input" placeholder={lang==='en'?'Details...':'Detalles...'} />
            </div>
            <div className="form-group">
              <label className="form-label">{lang==='en'?'EXP cost':'Coste en EXP'}</label>
              <input ref={expRef} className="form-input" type="number" defaultValue={300} min={1} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>{lang==='en'?'Cancel':'Cancelar'}</button>
              <button className="btn btn-primary" onClick={() => {
                const name = nameRef.current?.value?.trim(); if (!name) return
                addReward(name, descRef.current?.value?.trim(), parseInt(expRef.current?.value)||300, selEmoji)
                setModal(false)
              }}>{lang==='en'?'Add':'Añadir'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm redeem */}
      {confirm && (
        <div className="overlay" onClick={e => e.target===e.currentTarget && setConfirm(null)}>
          <div className="modal" style={{ textAlign:'center' }}>
            <div style={{ fontSize:60, marginBottom:12 }}>{confirm.emoji}</div>
            <div style={{ fontSize:22, fontWeight:800, marginBottom:6 }}>
              {lang==='en'?'You earned this!':'¡Te lo has ganado!'}
            </div>
            <div style={{ fontSize:16, fontWeight:600, marginBottom:8 }}>{confirm.name}</div>
            <div style={{ fontSize:13, color:'var(--text2)', marginBottom:4 }}>
              {lang==='en'?'This will spend:':'Esto gastará:'}
              <span style={{ fontFamily:'var(--mono)', fontWeight:700, color:'var(--accent)', marginLeft:6 }}>
                {confirm.exp_cost} EXP
              </span>
            </div>
            <div style={{ fontSize:12, color:'var(--text3)', marginBottom:24 }}>
              {lang==='en'
                ?'Your level and stats are safe — only your reward balance decreases.'
                :'Tu nivel y stats no cambian — solo baja tu saldo de recompensas.'}
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
              <button className="btn btn-ghost" onClick={() => setConfirm(null)}>
                {lang==='en'?'Not yet':'Aún no'}
              </button>
              <button className="btn btn-primary" style={{ fontSize:15, padding:'12px 28px' }}
                onClick={() => doRedeem(confirm)}>
                🎉 {lang==='en'?'Enjoy it!':'¡A disfrutarlo!'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
