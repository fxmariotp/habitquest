import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const REWARD_EMOJIS = ['🎁','🍕','🎬','🏖️','🎮','🍣','🛁','🎯','🏋️','📚','🎸','✈️','🍰','🥂','🎪','🛍️','🎨','🏊','🚴','🎭']

const PRESETS = {
  es: [
    { name: 'Cena fuera',          emoji: '🍕', exp_cost: 500  },
    { name: 'Tarde de ocio',       emoji: '🎮', exp_cost: 300  },
    { name: 'Peli en el cine',     emoji: '🎬', exp_cost: 200  },
    { name: 'Día de playa',        emoji: '🏖️', exp_cost: 800  },
    { name: 'Capricho de ropa',    emoji: '🛍️', exp_cost: 1000 },
    { name: 'Fin de semana libre', emoji: '✈️', exp_cost: 2000 },
  ],
  en: [
    { name: 'Dinner out',          emoji: '🍕', exp_cost: 500  },
    { name: 'Leisure afternoon',   emoji: '🎮', exp_cost: 300  },
    { name: 'Cinema night',        emoji: '🎬', exp_cost: 200  },
    { name: 'Beach day',           emoji: '🏖️', exp_cost: 800  },
    { name: 'Shopping treat',      emoji: '🛍️', exp_cost: 1000 },
    { name: 'Free weekend',        emoji: '✈️', exp_cost: 2000 },
  ],
}

export default function RewardsPage({ profile, lang }) {
  const [rewards, setRewards]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [selEmoji, setSelEmoji]   = useState('🎁')
  const [redeemMsg, setRedeemMsg] = useState(null) // { id, name }
  const nameRef    = useRef()
  const descRef    = useRef()
  const expRef     = useRef()

  const totalExp = profile?.total_exp || 0

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('rewards')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
    if (data) setRewards(data)
    setLoading(false)
  }

  async function addReward(name, description, exp_cost, emoji) {
    const { data, error } = await supabase.from('rewards').insert({
      user_id:     profile.id,
      name, description, exp_cost, emoji,
    }).select().single()
    if (!error && data) setRewards(r => [data, ...r])
  }

  async function addPreset(preset) {
    const { data, error } = await supabase.from('rewards').insert({
      user_id:  profile.id,
      name:     preset.name,
      emoji:    preset.emoji,
      exp_cost: preset.exp_cost,
    }).select().single()
    if (!error && data) setRewards(r => [data, ...r])
  }

  async function redeem(reward) {
    if (totalExp < reward.exp_cost) return
    setRedeemMsg(reward)
  }

  async function confirmRedeem(reward) {
    await supabase.from('rewards')
      .update({ redeemed: true, redeemed_at: new Date().toISOString() })
      .eq('id', reward.id)
    setRewards(rs => rs.map(r => r.id === reward.id ? { ...r, redeemed: true } : r))
    setRedeemMsg(null)
  }

  async function deleteReward(id) {
    if (!confirm(lang === 'en' ? 'Delete this reward?' : '¿Eliminar esta recompensa?')) return
    await supabase.from('rewards').delete().eq('id', id)
    setRewards(rs => rs.filter(r => r.id !== id))
  }

  async function resetReward(id) {
    await supabase.from('rewards').update({ redeemed: false, redeemed_at: null }).eq('id', id)
    setRewards(rs => rs.map(r => r.id === id ? { ...r, redeemed: false, redeemed_at: null } : r))
  }

  const available  = rewards.filter(r => !r.redeemed)
  const redeemed   = rewards.filter(r => r.redeemed)

  if (loading) return <div className="loading">...</div>

  return (
    <div>
      <div className="sec-head">
        <div className="sec-title">{lang === 'en' ? 'Rewards' : 'Recompensas'}</div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>
          + {lang === 'en' ? 'New' : 'Nueva'}
        </button>
      </div>

      {/* EXP disponible */}
      <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'14px 18px', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:'var(--shadow)' }}>
        <div>
          <div style={{ fontFamily:'var(--mono)', fontSize:11, letterSpacing:1, color:'var(--text3)', marginBottom:3 }}>
            {lang === 'en' ? 'YOUR TOTAL EXP' : 'TU EXP TOTAL'}
          </div>
          <div style={{ fontFamily:'var(--mono)', fontSize:26, fontWeight:700, color:'var(--accent)' }}>
            {totalExp.toLocaleString()}
          </div>
        </div>
        <div style={{ fontSize:36 }}>⚡</div>
      </div>

      {/* Presets — solo si no tiene ninguna recompensa aún */}
      {rewards.length === 0 && (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:2, color:'var(--text3)', marginBottom:10 }}>
            {lang === 'en' ? 'QUICK ADD' : 'AÑADIR RÁPIDO'}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {(PRESETS[lang] || PRESETS.es).map(p => (
              <button key={p.name} onClick={() => addPreset(p)}
                style={{ background:'var(--panel)', border:'1px dashed var(--border2)', borderRadius:'var(--r)', padding:'12px 14px', cursor:'pointer', textAlign:'left', transition:'all .15s', display:'flex', gap:10, alignItems:'center' }}
                onMouseEnter={e => e.currentTarget.style.borderColor='var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor='var(--border2)'}>
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

      {/* Recompensas disponibles */}
      {available.length === 0 && rewards.length > 0 && (
        <div className="empty" style={{ padding:'32px 20px' }}>
          {lang === 'en' ? 'All rewards redeemed 🎉' : '¡Todas las recompensas canjeadas! 🎉'}
        </div>
      )}

      {available.map(r => {
        const canRedeem   = totalExp >= r.exp_cost
        const pct         = Math.min(100, (totalExp / r.exp_cost) * 100)
        const missing     = Math.max(0, r.exp_cost - totalExp)

        return (
          <div key={r.id} style={{ background:'var(--panel)', border:`1.5px solid ${canRedeem ? 'var(--accent)' : 'var(--border)'}`, borderRadius:'var(--r)', padding:'16px 18px', marginBottom:10, boxShadow: canRedeem ? '0 0 20px rgba(212,255,0,.08)' : 'var(--shadow)', transition:'all .3s' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
              <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                <span style={{ fontSize:32 }}>{r.emoji}</span>
                <div>
                  <div style={{ fontSize:16, fontWeight:700 }}>{r.name}</div>
                  {r.description && <div style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>{r.description}</div>}
                  <div style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--accent)', marginTop:3 }}>
                    {r.exp_cost.toLocaleString()} EXP {lang === 'en' ? 'required' : 'necesaria'}
                  </div>
                </div>
              </div>
              <button className="btn-icon" style={{ flexShrink:0 }} onClick={() => deleteReward(r.id)}>✕</button>
            </div>

            {/* Barra de progreso hacia el desbloqueo */}
            {!canRedeem && (
              <div style={{ marginBottom:10 }}>
                <div style={{ height:6, background:'var(--bg3)', borderRadius:3, overflow:'hidden', marginBottom:4 }}>
                  <div style={{ height:'100%', width: pct+'%', background:'var(--accent)', borderRadius:3, transition:'width .6s' }} />
                </div>
                <div style={{ fontSize:11, color:'var(--text3)', fontFamily:'var(--mono)' }}>
                  {lang === 'en' ? `${missing.toLocaleString()} EXP to unlock` : `Faltan ${missing.toLocaleString()} EXP para desbloquear`}
                </div>
              </div>
            )}

            {/* Botón de canjear */}
            <button
              onClick={() => canRedeem && redeem(r)}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: 'var(--r-sm)',
                border: 'none',
                background: canRedeem ? 'var(--accent)' : 'var(--bg3)',
                color: canRedeem ? 'var(--accent-fg)' : 'var(--text3)',
                fontFamily: 'var(--font)',
                fontSize: 14,
                fontWeight: 700,
                cursor: canRedeem ? 'pointer' : 'not-allowed',
                transition: 'all .2s',
              }}>
              {canRedeem
                ? (lang === 'en' ? '🎉 Redeem reward' : '🎉 Canjear recompensa')
                : (lang === 'en' ? '🔒 Not enough EXP yet' : '🔒 Aún no tienes suficiente EXP')}
            </button>
          </div>
        )
      })}

      {/* Historial canjeadas */}
      {redeemed.length > 0 && (
        <div style={{ marginTop:20 }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:2, color:'var(--text3)', marginBottom:10 }}>
            {lang === 'en' ? 'REDEEMED' : 'CANJEADAS'}
          </div>
          {redeemed.map(r => (
            <div key={r.id} style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'12px 16px', marginBottom:8, opacity:.5, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <span style={{ fontSize:24, filter:'grayscale(1)' }}>{r.emoji}</span>
                <div>
                  <div style={{ fontSize:14, fontWeight:600, textDecoration:'line-through' }}>{r.name}</div>
                  <div style={{ fontSize:11, color:'var(--text3)', fontFamily:'var(--mono)' }}>
                    {new Date(r.redeemed_at).toLocaleDateString(lang === 'en' ? 'en-GB' : 'es-ES')}
                  </div>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => resetReward(r.id)}
                title={lang === 'en' ? 'Reset to available' : 'Volver a disponible'}>↺</button>
            </div>
          ))}
        </div>
      )}

      {/* Modal nueva recompensa */}
      {modal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-handle" />
            <div className="modal-title">{lang === 'en' ? 'New Reward' : 'Nueva recompensa'}</div>

            {/* Emoji picker */}
            <div className="form-group">
              <label className="form-label">{lang === 'en' ? 'Emoji' : 'Emoji'}</label>
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
              <label className="form-label">{lang === 'en' ? 'Name' : 'Nombre'}</label>
              <input ref={nameRef} className="form-input" placeholder={lang === 'en' ? 'e.g. Dinner out' : 'ej. Cena fuera'} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">{lang === 'en' ? 'Description (optional)' : 'Descripción (opcional)'}</label>
              <input ref={descRef} className="form-input" placeholder={lang === 'en' ? 'Any details...' : 'Detalles...'} />
            </div>
            <div className="form-group">
              <label className="form-label">{lang === 'en' ? 'Minimum EXP to unlock' : 'EXP mínima para desbloquear'}</label>
              <input ref={expRef} className="form-input" type="number" defaultValue={500} min={1} />
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>
                {lang === 'en' ? 'Cancel' : 'Cancelar'}
              </button>
              <button className="btn btn-primary" onClick={() => {
                const name = nameRef.current?.value?.trim()
                if (!name) return
                addReward(name, descRef.current?.value?.trim(), parseInt(expRef.current?.value) || 500, selEmoji)
                setModal(false)
              }}>
                {lang === 'en' ? 'Add reward' : 'Añadir recompensa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm redeem modal */}
      {redeemMsg && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setRedeemMsg(null)}>
          <div className="modal" style={{ textAlign:'center' }}>
            <div style={{ fontSize:56, marginBottom:12 }}>{redeemMsg.emoji}</div>
            <div style={{ fontSize:20, fontWeight:800, marginBottom:8 }}>
              {lang === 'en' ? 'You earned this!' : '¡Te lo has ganado!'}
            </div>
            <div style={{ fontSize:15, color:'var(--text2)', marginBottom:24 }}>
              {lang === 'en'
                ? `Ready to redeem "${redeemMsg.name}"? Your EXP won't be deducted.`
                : `¿Listo para canjear "${redeemMsg.name}"? Tu EXP no se descontará.`}
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
              <button className="btn btn-ghost" onClick={() => setRedeemMsg(null)}>
                {lang === 'en' ? 'Not yet' : 'Aún no'}
              </button>
              <button className="btn btn-primary" style={{ fontSize:15, padding:'12px 24px' }}
                onClick={() => confirmRedeem(redeemMsg)}>
                🎉 {lang === 'en' ? 'Redeem!' : '¡Canjear!'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
