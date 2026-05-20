import { useState } from 'react'
import { AVATARS } from '../lib/game'
import { t } from '../i18n/translations'

export default function ProfilePage({ profile, updateProfile, lang }) {
  const [name, setName]     = useState(profile?.display_name || '')
  const [username, setUser] = useState(profile?.username || '')
  const [saved, setSaved]   = useState(false)
  const [copied, setCopied] = useState(false)

  async function save() {
    await updateProfile({ display_name: name, username: username.toLowerCase().replace(/[^a-z0-9_]/g,'') })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function copyLink() {
    const url = `${window.location.origin}/u/${profile?.username || profile?.id}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <div className="sec-head">
        <div className="sec-title">{t(lang,'profile').toUpperCase()}</div>
      </div>

      {/* Public profile card */}
      <div style={{ background:'var(--panel)', border:'1px solid var(--accent)', borderRadius:8, padding:16, marginBottom:16, display:'flex', gap:14, alignItems:'center' }}>
        <div style={{ fontSize:48 }}>{profile?.avatar_emoji || '🧙'}</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:18, fontWeight:700, color:'var(--accent)', fontFamily:'var(--font-mono)' }}>{profile?.display_name || 'Héroe'}</div>
          <div style={{ fontSize:13, color:'var(--text2)' }}>Lv {profile?.level} · {profile?.class_name}</div>
          <div style={{ fontSize:13, color:'var(--text3)', fontFamily:'var(--font-mono)', marginTop:2 }}>
            {profile?.username ? `habitquest.app/u/${profile.username}` : lang==='en'?'Set a username to get your public link':'Configura un username para tu enlace público'}
          </div>
        </div>
        {profile?.username && (
          <button className="btn-ghost" onClick={copyLink}>
            {copied ? t(lang,'linkCopied') : t(lang,'shareProfile')}
          </button>
        )}
      </div>

      {/* Edit form */}
      <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:8, padding:16, marginBottom:16 }}>
        <div className="form-group">
          <label className="form-label">{t(lang,'name').toUpperCase()}</label>
          <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Gandalf" />
        </div>
        <div className="form-group">
          <label className="form-label">{t(lang,'username').toUpperCase()}</label>
          <input className="form-input" value={username} onChange={e => setUser(e.target.value)} placeholder={t(lang,'usernamePlaceholder')} />
          <div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>
            {lang==='en' ? 'Only letters, numbers and underscores. Used to find you in leaderboard.' : 'Solo letras, números y guiones bajos. Lo usan tus amigos para añadirte.'}
          </div>
        </div>
        <button className="btn-primary" onClick={save}>{saved ? '✓ Guardado' : t(lang,'saveProfile')}</button>
      </div>

      {/* Avatar picker */}
      <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:8, padding:16 }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:1, color:'var(--text3)', marginBottom:10 }}>
          {t(lang,'chooseAvatar').toUpperCase()}
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          {AVATARS.map(a => (
            <button key={a} onClick={() => updateProfile({ avatar_emoji: a })}
              style={{ fontSize:28, width:46, height:46, borderRadius:8, border:`2px solid ${profile?.avatar_emoji===a?'var(--accent)':'var(--border)'}`, background: profile?.avatar_emoji===a?'rgba(212,255,0,.08)':'var(--bg3)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s' }}>
              {a}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
