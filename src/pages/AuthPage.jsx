import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { t } from '../i18n/translations'

export default function AuthPage({ lang, setLang }) {
  const [mode, setMode]     = useState('login')  // 'login' | 'register'
  const [email, setEmail]   = useState('')
  const [password, setPass] = useState('')
  const [name, setName]     = useState('')
  const [error, setError]   = useState('')
  const [info, setInfo]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setInfo(''); setLoading(true)

    if (mode === 'register') {
      const { error: err } = await supabase.auth.signUp({
        email, password,
        options: { data: { display_name: name || email.split('@')[0] } }
      })
      if (err) setError(t(lang,'authError'))
      else setInfo(t(lang,'registerSuccess'))
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) setError(t(lang,'authError'))
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:20 }}>

      {/* Logo */}
      <div style={{ fontFamily:'var(--font-mono)', fontSize:28, fontWeight:700, color:'var(--accent)', letterSpacing:4, marginBottom:8 }}>
        ⚔ HABITQUEST
      </div>
      <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text3)', letterSpacing:2, marginBottom:40 }}>
        {lang==='es' ? 'forja tu leyenda, un hábito a la vez' : 'forge your legend, one habit at a time'}
      </div>

      {/* Lang toggle */}
      <div style={{ display:'flex', gap:8, marginBottom:32 }}>
        {['es','en'].map(l => (
          <button key={l} className="btn-ghost"
            style={{ borderColor: lang===l ? 'var(--accent)' : 'var(--border)', color: lang===l ? 'var(--accent)' : 'var(--text2)' }}
            onClick={() => setLang(l)}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:12, padding:28, width:'100%', maxWidth:380 }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:14, letterSpacing:1, color:'var(--accent)', marginBottom:24 }}>
          {mode === 'login' ? t(lang,'loginTitle').toUpperCase() : t(lang,'registerTitle').toUpperCase()}
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">{t(lang,'name').toUpperCase()}</label>
              <input className="form-input" type="text" placeholder="Gandalf" value={name} onChange={e=>setName(e.target.value)} />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">{t(lang,'email').toUpperCase()}</label>
            <input className="form-input" type="email" placeholder="hero@quest.com" value={email} onChange={e=>setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">{t(lang,'password').toUpperCase()}</label>
            <input className="form-input" type="password" placeholder="••••••••" value={password} onChange={e=>setPass(e.target.value)} required minLength={6} />
          </div>

          {error && <div style={{ color:'var(--red)', fontSize:13, marginBottom:12 }}>{error}</div>}
          {info  && <div style={{ color:'var(--green)', fontSize:13, marginBottom:12 }}>{info}</div>}

          <button className="btn-primary" type="submit" disabled={loading} style={{ width:'100%', padding:'11px', fontSize:13 }}>
            {loading ? '...' : (mode==='login' ? t(lang,'login') : t(lang,'register')).toUpperCase()}
          </button>
        </form>

        <div style={{ marginTop:16, fontSize:13, color:'var(--text3)', textAlign:'center' }}>
          {mode==='login' ? t(lang,'noAccount') : t(lang,'hasAccount')}{' '}
          <button onClick={() => { setMode(mode==='login'?'register':'login'); setError(''); setInfo('') }}
            style={{ background:'none', border:'none', color:'var(--accent)', cursor:'pointer', fontFamily:'var(--font-mono)', fontSize:13 }}>
            {mode==='login' ? t(lang,'register') : t(lang,'login')}
          </button>
        </div>
      </div>
    </div>
  )
}
