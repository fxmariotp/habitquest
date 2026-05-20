import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { t } from '../i18n/translations'

export default function AuthPage({ lang, setLang, theme, toggleTheme }) {
  const [mode, setMode]   = useState('login')
  const [email, setEmail] = useState('')
  const [pass,  setPass]  = useState('')
  const [name,  setName]  = useState('')
  const [error, setError] = useState('')
  const [info,  setInfo]  = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault(); setError(''); setInfo(''); setLoading(true)
    if (mode === 'register') {
      const { error: err } = await supabase.auth.signUp({
        email, password: pass,
        options: { data: { display_name: name || email.split('@')[0] } }
      })
      if (err) setError(t(lang,'authError'))
      else     setInfo(t(lang,'registerSuccess'))
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password: pass })
      if (err) setError(t(lang,'authError'))
    }
    setLoading(false)
  }

  return (
    <div className="auth-wrap">
      {/* Top controls */}
      <div style={{ position:'fixed', top:16, right:16, display:'flex', gap:8 }}>
        {['es','en'].map(l=>(
          <button key={l} className="btn btn-ghost btn-sm"
            style={{ fontWeight: lang===l?700:400 }}
            onClick={()=>setLang(l)}>{l.toUpperCase()}</button>
        ))}
        <button className="btn-icon" onClick={toggleTheme}>{theme==='dark'?'☀️':'🌙'}</button>
      </div>

      <div className="auth-logo">⚔ HABITQUEST</div>
      <div className="auth-tagline">{lang==='es'?'Forja tu leyenda, un hábito a la vez':'Forge your legend, one habit at a time'}</div>

      <div className="auth-card">
        <div style={{ fontSize:18, fontWeight:800, marginBottom:20 }}>
          {mode==='login' ? t(lang,'loginTitle') : t(lang,'registerTitle')}
        </div>

        <form onSubmit={submit}>
          {mode==='register' && (
            <div className="form-group">
              <label className="form-label">{t(lang,'name')}</label>
              <input className="form-input" type="text" placeholder="Gandalf" value={name} onChange={e=>setName(e.target.value)} />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">{t(lang,'email')}</label>
            <input className="form-input" type="email" placeholder="hero@quest.com" value={email} onChange={e=>setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">{t(lang,'password')}</label>
            <input className="form-input" type="password" placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)} required minLength={6} />
          </div>

          {error && <div style={{ color:'#ff4444', fontSize:13, marginBottom:12 }}>{error}</div>}
          {info  && <div style={{ color:'#44cc88', fontSize:13, marginBottom:12 }}>{info}</div>}

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width:'100%', padding:'13px', fontSize:15, borderRadius:12 }}>
            {loading ? '...' : (mode==='login' ? t(lang,'login') : t(lang,'register'))}
          </button>
        </form>

        <div style={{ marginTop:16, fontSize:13, color:'var(--text3)', textAlign:'center' }}>
          {mode==='login' ? t(lang,'noAccount') : t(lang,'hasAccount')}{' '}
          <button onClick={()=>{setMode(mode==='login'?'register':'login');setError('');setInfo('')}}
            style={{ background:'none', border:'none', color:'var(--text)', cursor:'pointer', fontWeight:700, fontSize:13 }}>
            {mode==='login' ? t(lang,'register') : t(lang,'login')}
          </button>
        </div>
      </div>
    </div>
  )
}
