import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const REWARD_EMOJIS = ['🎁','🍕','🎬','🏖️','🎮','🍣','🛁','🎯','🏋️','📚','🎸','✈️','🍰','🥂','🎪','🛍️','🎨','🏊','🚴','🎭']

const PRESETS = {
  es: [
    { name:'Cena fuera',          emoji:'🍕', exp_cost:500  },
    { name:'Tarde de ocio',       emoji:'🎮', exp_cost:300  },
    { name:'Peli en el cine',     emoji:'🎬', exp_cost:200  },
    { name:'Día de playa',        emoji:'🏖️', exp_cost:800  },
    { name:'Capricho de ropa',    emoji:'🛍️', exp_cost:1000 },
    { name:'Fin de semana libre', emoji:'✈️', exp_cost:2000 },
  ],
  en: [
    { name:'Dinner out',          emoji:'🍕', exp_cost:500  },
    { name:'Leisure afternoon',   emoji:'🎮', exp_cost:300  },
    { name:'Cinema night',        emoji:'🎬', exp_cost:200  },
    { name:'Beach day',           emoji:'🏖️', exp_cost:800  },
    { name:'Shopping treat',      emoji:'🛍️', exp_cost:1000 },
    { name:'Free weekend',        emoji:'✈️', exp_cost:2000 },
  ],
}

export default function RewardsPage({ profile, lang }) {
  const [rewards, setRewards]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [selEmoji, setSelEmoji]   = useState('🎁')
  const [confirm, setConfirm]     = useState(null) // reward to confirm redeem
  const nameRef = useRef(); const descRef = useRef(); const expRef = useRef()

  const totalExp = profile?.total_exp || 0

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('rewards')
      .select('*')
      .eq('user_id', profile.id)
      .order('exp_cost', { ascending: true })
    if (data) setRewards(data)
    setLoading(false)
  }

  async function addReward(name, description, exp_cost, emoji) {
    const { data, error } = await supabase.from('rewards').insert({
      user_id: profile.id, name, description, exp_cost, emoji
    }).select().single()
    if (!error && data) setRewards(r => [...r, data].sort((a,b)=>a.exp_cost-b.exp_cost))
  }

  async function addPreset(preset) {
    const { data, error } = await supabase.from('rewards').insert({
      user_id: profile.id, name: preset.name, emoji: preset.emoji, exp_cost: preset.exp_cost
    }).select().single()
    if (!error && data) setRewards(r => [...r, data].sort((a,b)=>a.exp_cost-b.exp_cost))
  }

  // Registra un canje en historial pero NO elimina ni modifica la recompensa
  async function confirmRedeem(reward) {
    // Insert a redemption log entry (tabla reward_logs)
    await supabase.from('reward_logs').insert({
      user_id:   profile.id,
      reward_id: reward.id,
      reward_name: reward.name,
      emoji:     reward.emoji,
      exp_cost:  reward.exp_cost,
    })
    // Update redeemed_at on the reward (but keep it available)
    await supabase.from('rewards')
      .update({ redeemed: true, redeemed_at: new Date().toISOString() })
      .eq('id', reward.id)
    setRewards(rs => rs.map(r => r.id===reward.id ? { ...r, redeemed:true, redeemed_at: new Date().toISOString() } : r))
    setConfirm(null)
  }

  async function deleteReward(id) {
    if (!window.confirm(lang==='en'?'Delete this reward?':'¿Eliminar esta recompensa?')) return
    await supabase.from('rewards').delete().eq('id', id)
    setRewards(rs => rs.filter(r => r.id !== id))
  }

  // Marca como disponible de nuevo (reset) sin borrar
  async function resetReward(id) {
    await supabase.from('rewards').update({ redeemed: false, redeemed_at: null }).eq('id', id)
    setRewards(rs => rs.map(r => r.id===id ? { ...r, redeemed:false, redeemed_at:null } : r))
  }

  if (loading) return <div className="loading">...</div>

  const unlocked = rewards.filter(r => totalExp >= r.exp_cost)
  const locked   = rewards.filter(r => totalExp < r.exp_cost)

  return (
    <div>
      <div className="sec-head">
        <div className="sec-title">{lang==='en'?'Rewards':'Recompensas'}</div>
        <button className="btn btn-primary" onClick={()=>{ setModal(true); setSelEmoji('🎁') }}>
          + {lang==='en'?'New':'Nueva'}
        </button>
      </div>

      {/* EXP total */}
      <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'16px 20px', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:'var(--shadow)' }}>
        <div>
          <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:2, color:'var(--text3)', marginBottom:4 }}>
            {lang==='en'?'YOUR TOTAL EXP':'TU EXP TOTAL'}
          </div>
          <div style={{ fontFamily:'var(--mono)', fontSize:28, fontWeight:700, color:'var(--accent)' }}>
            {totalExp.toLocaleString()}
          </div>
          <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>
            {lang==='en'
              ?'EXP is never spent — reaching the threshold unlocks the reward'
              :'La EXP no se gasta — llegar al umbral desbloquea la recompensa'}
          </div>
        </div>
        <div style={{ fontSize:40 }}>⚡</div>
      </div>

      {/* Presets si no hay ninguna */}
      {rewards.length === 0 && (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:2, color:'var(--text3)', marginBottom:10 }}>
            {lang==='en'?'QUICK ADD':'AÑADIR RÁPIDO'}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {(PRESETS[lang]||PRESETS.es).map(p=>(
              <button key={p.name} onClick={()=>addPreset(p)}
                style={{ background:'var(--panel)', border:'1.5px dashed var(--border2)', borderRadius:'var(--r)', padding:'12px 14px', cursor:'pointer', textAlign:'left', transition:'all .15s', display:'flex', gap:10, alignItems:'center' }}
                onMouseEnter={e=>e.currentTarget.style.borderColor='var(--accent)'}
                onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border2)'}>
                <span style={{ fontSize:24 }}>{p.emoji}</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:600 }}>{p.name}</div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--accent)' }}>{p.exp_cost.toLocaleString()} EXP</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Desbloqueadas ── */}
      {unlocked.length > 0 && (
        <div style={{ marginBottom:8 }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:2, color:'var(--d-easy)', marginBottom:10 }}>
            ✓ {lang==='en'?'UNLOCKED':'DESBLOQUEADAS'} ({unlocked.length})
          </div>
          {unlocked.map(r => (
            <div key={r.id} style={{ background:'var(--panel)', border:'1.5px solid var(--accent)', borderRadius:'var(--r)', padding:'16px 18px', marginBottom:10, boxShadow:'0 0 16px rgba(212,255,0,.07)', position:'relative' }}>
              <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:12 }}>
                <span style={{ fontSize:32 }}>{r.emoji}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:16, fontWeight:700 }}>{r.name}</div>
                  {r.description && <div style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>{r.description}</div>}
                  <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--accent)', marginTop:3 }}>
                    {r.exp_cost.toLocaleString()} EXP
                    {r.redeemed && r.redeemed_at && (
                      <span style={{ color:'var(--text3)', marginLeft:8 }}>
                        · {lang==='en'?'last redeemed':'último canje'}: {new Date(r.redeemed_at).toLocaleDateString(lang==='en'?'en-GB':'es-ES')}
                      </span>
                    )}
                  </div>
                </div>
                <button className="btn-icon" onClick={()=>deleteReward(r.id)} style={{ flexShrink:0 }}>✕</button>
              </div>
              <button onClick={()=>setConfirm(r)}
                style={{ width:'100%', padding:'11px', borderRadius:'var(--r-sm)', border:'none', background:'var(--accent)', color:'var(--accent-fg)', fontFamily:'var(--font)', fontSize:14, fontWeight:700, cursor:'pointer', transition:'all .2s' }}>
                🎉 {lang==='en'?'Redeem':'Canjear'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Bloqueadas ── */}
      {locked.length > 0 && (
        <div>
          <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:2, color:'var(--text3)', marginBottom:10 }}>
            🔒 {lang==='en'?'LOCKED':'BLOQUEADAS'} ({locked.length})
          </div>
          {locked.map(r => {
            const pct     = Math.min(100, (totalExp / r.exp_cost) * 100)
            const missing = r.exp_cost - totalExp
            return (
              <div key={r.id} style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'16px 18px', marginBottom:10, boxShadow:'var(--shadow)', opacity:.75 }}>
                <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:10 }}>
                  <span style={{ fontSize:32, filter:'grayscale(.5)' }}>{r.emoji}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:16, fontWeight:700 }}>{r.name}</div>
                    {r.description && <div style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>{r.description}</div>}
                    <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text3)', marginTop:3 }}>
                      {lang==='en'?`${missing.toLocaleString()} EXP to unlock`:`Faltan ${missing.toLocaleString()} EXP`}
                    </div>
                  </div>
                  <button className="btn-icon" onClick={()=>deleteReward(r.id)} style={{ flexShrink:0 }}>✕</button>
                </div>
                <div style={{ height:6, background:'var(--bg3)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:pct+'%', background:'var(--accent)', borderRadius:3, transition:'width .6s', opacity:.5 }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {rewards.length === 0 && (
        <div className="empty">
          {lang==='en'?'No rewards yet. Add some above!':'Sin recompensas. ¡Añade alguna arriba!'}
        </div>
      )}

      {/* ── Modal nueva recompensa ── */}
      {modal && (
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal">
            <div className="modal-handle"/>
            <div className="modal-title">{lang==='en'?'New Reward':'Nueva recompensa'}</div>
            <div className="form-group">
              <label className="form-label">Emoji</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {REWARD_EMOJIS.map(e=>(
                  <button key={e} onClick={()=>setSelEmoji(e)}
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
              <input ref={descRef} className="form-input" placeholder={lang==='en'?'Any details...':'Detalles...'} />
            </div>
            <div className="form-group">
              <label className="form-label">{lang==='en'?'Minimum EXP to unlock':'EXP mínima para desbloquear'}</label>
              <input ref={expRef} className="form-input" type="number" defaultValue={500} min={1} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={()=>setModal(false)}>{lang==='en'?'Cancel':'Cancelar'}</button>
              <button className="btn btn-primary" onClick={()=>{
                const name=nameRef.current?.value?.trim(); if(!name)return
                addReward(name, descRef.current?.value?.trim(), parseInt(expRef.current?.value)||500, selEmoji)
                setModal(false)
              }}>{lang==='en'?'Add reward':'Añadir recompensa'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm redeem modal ── */}
      {confirm && (
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setConfirm(null)}>
          <div className="modal" style={{ textAlign:'center' }}>
            <div style={{ fontSize:64, marginBottom:12 }}>{confirm.emoji}</div>
            <div style={{ fontSize:22, fontWeight:800, marginBottom:8 }}>
              {lang==='en'?'You earned this!':'¡Te lo has ganado!'}
            </div>
            <div style={{ fontSize:15, color:'var(--text2)', lineHeight:1.5, marginBottom:8 }}>
              <strong>{confirm.name}</strong>
            </div>
            <div style={{ fontSize:13, color:'var(--text3)', marginBottom:24 }}>
              {lang==='en'
                ?'Your EXP stays intact — this reward will remain available to redeem again anytime.'
                :'Tu EXP no se descuenta — esta recompensa seguirá disponible para canjearla cuantas veces quieras.'}
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
              <button className="btn btn-ghost" onClick={()=>setConfirm(null)}>
                {lang==='en'?'Not yet':'Aún no'}
              </button>
              <button className="btn btn-primary" style={{ fontSize:15, padding:'12px 28px' }}
                onClick={()=>confirmRedeem(confirm)}>
                🎉 {lang==='en'?'Enjoy it!':'¡A disfrutarlo!'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
