import { useState } from 'react'
import { ACHIEVEMENTS } from '../lib/game'
import { t } from '../i18n/translations'

export default function ProfilePage({ profile, achievements, updateProfile, lang, theme, setTheme, onLogout }) {
  const [name,     setName]    = useState(profile?.display_name || '')
  const [username, setUser]    = useState(profile?.username || '')
  const [saved,    setSaved]   = useState(false)
  const [copied,   setCopied]  = useState(false)
  const [editingEmoji, setEditingEmoji] = useState(false)
  const [emojiInput,   setEmojiInput]   = useState('')

  const AVATAR_COLORS = [
    '#FF6B6B','#FF8E53','#FFC107','#69DB7C','#40C057','#20C997',
    '#4DABF7','#4C6EF5','#748FFC','#DA77F2','#F783AC','#FFFFFF',
  ]

  function handleEmojiChange(e) {
    const val = e.target.value
    if (!val) return setEmojiInput('')
    let first = val
    try { first = [...new Intl.Segmenter().segment(val)][0]?.segment || [...val][0] || val }
    catch { first = [...val][0] || val }
    setEmojiInput(first)
    if (first.codePointAt(0) > 127) {
      updateProfile({ avatar_emoji: first })
      setEditingEmoji(false)
      setEmojiInput('')
    }
  }

  async function save() {
    await updateProfile({
      display_name: name,
      username: username.toLowerCase().replace(/[^a-z0-9_]/g,'')
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function copyLink() {
    const url = `${window.location.origin}/u/${profile?.username}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const unlockedAch = ACHIEVEMENTS.filter(a => achievements?.some(x => x.achievement_id === a.id))

  const settingRow = (label, content) => (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 0', borderBottom:'1px solid var(--border)' }}>
      <span style={{ fontSize:15, fontWeight:500 }}>{label}</span>
      <div>{content}</div>
    </div>
  )

  return (
    <div>
      <div className="sec-head">
        <div className="sec-title">{lang==='en'?'Profile':'Perfil'}</div>
      </div>

      {/* Profile card */}
      <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:14, padding:20, marginBottom:12, display:'flex', gap:14, alignItems:'center' }}>
        <div style={{ fontSize:52 }}>{profile?.avatar_emoji||'🧙'}</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:18, fontWeight:800 }}>{profile?.display_name||'Hero'}</div>
          <div style={{ fontSize:13, color:'var(--text2)' }}>Lv {profile?.level} · {profile?.class_name}</div>
          {profile?.username && (
            <div style={{ fontSize:12, color:'var(--text3)', fontFamily:'var(--mono)', marginTop:2 }}>
              habitquest.app/u/{profile.username}
            </div>
          )}
        </div>
        {profile?.username && (
          <button className="btn btn-ghost btn-sm" onClick={copyLink}>
            {copied ? '✓ Copiado' : (lang==='en'?'Share':'Compartir')}
          </button>
        )}
      </div>

      {/* Edit info */}
      <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:14, padding:18, marginBottom:12 }}>
        <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:2, color:'var(--text3)', marginBottom:14 }}>
          {lang==='en'?'EDIT PROFILE':'EDITAR PERFIL'}
        </div>
        <div className="form-group">
          <label className="form-label">{lang==='en'?'Display name':'Nombre visible'}</label>
          <input className="form-input" value={name} onChange={e=>setName(e.target.value)} placeholder="Gandalf" />
        </div>
        <div className="form-group" style={{ marginBottom:14 }}>
          <label className="form-label">Username {lang==='en'?'(for public link)':'(para enlace público)'}</label>
          <input className="form-input" value={username} onChange={e=>setUser(e.target.value)} placeholder="gandalf" />
          <div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>
            {lang==='en'?'Letters, numbers and underscores only':'Solo letras, números y guiones bajos'}
          </div>
        </div>
        <button className="btn btn-primary" onClick={save}>
          {saved ? '✓ '+(lang==='en'?'Saved':'Guardado') : (lang==='en'?'Save changes':'Guardar cambios')}
        </button>
      </div>

      {/* Avatar picker */}
      <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:14, padding:18, marginBottom:12 }}>
        <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:2, color:'var(--text3)', marginBottom:16 }}>
          AVATAR
        </div>

        {/* Emoji selector */}
        <div style={{ textAlign:'center', marginBottom:16 }}>
          <button
            onClick={() => { setEditingEmoji(true); setEmojiInput('') }}
            style={{ width:80, height:80, fontSize:52, borderRadius:16,
              border:`2.5px solid ${profile?.avatar_color || '#4DABF7'}`,
              boxShadow:`0 0 12px ${profile?.avatar_color || '#4DABF7'}55`,
              background:'var(--bg3)', cursor:'pointer',
              display:'inline-flex', alignItems:'center', justifyContent:'center',
              transition:'all .2s' }}>
            {profile?.avatar_emoji || '🧙'}
          </button>
          <div style={{ fontSize:11, color:'var(--text3)', marginTop:8 }}>
            {lang==='en' ? 'Tap to change · any emoji from your keyboard' : 'Pulsa para cambiar · cualquier emoji del teclado'}
          </div>
        </div>

        {editingEmoji && (
          <div className="form-group">
            <input
              autoFocus
              className="form-input"
              style={{ fontSize:22, textAlign:'center', letterSpacing:4 }}
              placeholder={lang==='en' ? 'Type or paste an emoji…' : 'Escribe o pega un emoji…'}
              value={emojiInput}
              onChange={handleEmojiChange}
              onBlur={() => { setEditingEmoji(false); setEmojiInput('') }}
            />
          </div>
        )}

        {/* Color palette */}
        <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:2, color:'var(--text3)', marginBottom:10, marginTop:4 }}>
          {lang==='en' ? 'AVATAR COLOR' : 'COLOR DEL AVATAR'}
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
          {AVATAR_COLORS.map(c => {
            const selected = (profile?.avatar_color || '#4DABF7') === c
            return (
              <button key={c} onClick={() => updateProfile({ avatar_color: c })}
                style={{ width:36, height:36, borderRadius:'50%', background:c, cursor:'pointer',
                  border: selected ? '3px solid var(--text)' : '3px solid transparent',
                  outline: selected ? `2px solid ${c}` : 'none',
                  outlineOffset:2,
                  transform: selected ? 'scale(1.2)' : 'scale(1)',
                  transition:'all .15s',
                  boxShadow:`0 2px 8px ${c}66` }} />
            )
          })}
        </div>
      </div>

      {/* Ajustes */}
      <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:14, padding:'0 18px', marginBottom:12 }}>
        <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:2, color:'var(--text3)', padding:'14px 0 0' }}>
          {lang==='en'?'PREFERENCES':'PREFERENCIAS'}
        </div>

        {settingRow(lang==='en'?'Dark mode':'Modo oscuro',
          <button onClick={()=>setTheme(theme==='dark'?'light':'dark')}
            style={{ width:50, height:28, borderRadius:100, border:'none', background:theme==='dark'?'var(--accent)':'var(--border2)', cursor:'pointer', position:'relative', transition:'background .2s' }}>
            <div style={{ width:20, height:20, borderRadius:'50%', background:theme==='dark'?'var(--accent-fg)':'var(--panel)', position:'absolute', top:4, left:theme==='dark'?26:4, transition:'left .2s', boxShadow:'0 1px 4px rgba(0,0,0,.3)' }}/>
          </button>
        )}

        {settingRow(lang==='en'?'Sound effects':'Efectos de sonido',
          <button onClick={()=>updateProfile({sound_on:!profile?.sound_on})}
            style={{ width:50, height:28, borderRadius:100, border:'none', background:profile?.sound_on?'var(--accent)':'var(--border2)', cursor:'pointer', position:'relative', transition:'background .2s' }}>
            <div style={{ width:20, height:20, borderRadius:'50%', background:profile?.sound_on?'var(--accent-fg)':'var(--panel)', position:'absolute', top:4, left:profile?.sound_on?26:4, transition:'left .2s', boxShadow:'0 1px 4px rgba(0,0,0,.3)' }}/>
          </button>
        )}

        {settingRow(lang==='en'?'Language':'Idioma',
          <div style={{ display:'flex', gap:6 }}>
            {['es','en'].map(l=>(
              <button key={l} onClick={()=>updateProfile({language:l})}
                style={{ padding:'5px 12px', borderRadius:20, border:`1.5px solid ${lang===l?'var(--accent)':'var(--border)'}`, background:lang===l?'var(--accent)':'transparent', color:lang===l?'var(--accent-fg)':'var(--text2)', fontFamily:'var(--mono)', fontSize:12, fontWeight:700, cursor:'pointer', transition:'all .15s' }}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        <div style={{ padding:'14px 0' }}>
          <button className="btn btn-ghost" onClick={onLogout} style={{ color:'var(--red)', borderColor:'var(--red)', width:'100%' }}>
            {lang==='en'?'Sign out':'Cerrar sesión'}
          </button>
        </div>
      </div>

      {/* Logros */}
      {unlockedAch.length > 0 && (
        <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:14, padding:18 }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:2, color:'var(--text3)', marginBottom:14 }}>
            {lang==='en'?'ACHIEVEMENTS':'LOGROS'} ({unlockedAch.length}/{ACHIEVEMENTS.length})
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {ACHIEVEMENTS.map(a=>{
              const on = achievements?.some(x=>x.achievement_id===a.id)
              return (
                <div key={a.id} style={{ display:'flex', gap:8, alignItems:'center', padding:'10px 10px', background:'var(--bg3)', borderRadius:10, opacity:on?1:.3, filter:on?'none':'grayscale(1)' }}>
                  <span style={{ fontSize:22 }}>{a.icon}</span>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700 }}>{lang==='en'?a.nameEn:a.name}</div>
                    <div style={{ fontSize:10, color:'var(--text3)' }}>{lang==='en'?a.descEn:a.desc}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
