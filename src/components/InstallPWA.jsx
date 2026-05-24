import { useState, useEffect } from 'react'

const ShareIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0 }}>
    <path d="M12 2L8 6h3v8h2V6h3L12 2z" fill="currentColor"/>
    <path d="M4 12v8h16v-8h-2v6H6v-6H4z" fill="currentColor"/>
  </svg>
)

function detect() {
  const ua = navigator.userAgent
  const isIOS        = /iphone|ipad|ipod/i.test(ua)
  const isSafari     = /^((?!chrome|android).)*safari/i.test(ua)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  return { isIOS, isSafari, isStandalone }
}

export default function InstallPWA({ lang }) {
  const [prompt,   setPrompt]   = useState(null)
  const [showDroid, setDroid]   = useState(false)
  const [showIOS,   setIOS]     = useState(false)

  useEffect(() => {
    const { isIOS, isSafari, isStandalone } = detect()

    // iOS Safari — manual install banner
    if (isIOS && isSafari && !isStandalone && !localStorage.getItem('ios-banner-dismissed')) {
      setIOS(true)
    }

    // Android / Chrome / Edge — native prompt banner
    if (!localStorage.getItem('pwa-dismissed')) {
      const handler = (e) => {
        e.preventDefault()
        setPrompt(e)
        setDroid(true)
      }
      window.addEventListener('beforeinstallprompt', handler)
      return () => window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  // ── Android / Chrome banner ───────────────────
  if (showDroid) return (
    <div style={bannerStyle}>
      <img src="/logo.png" style={{ width:40, height:40, borderRadius:8, flexShrink:0 }} alt="" />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:700, fontSize:14 }}>
          {lang === 'en' ? 'Install HabitQuest' : 'Instalar HabitQuest'}
        </div>
        <div style={{ fontSize:12, color:'var(--text2)' }}>
          {lang === 'en' ? 'Add to your home screen' : 'Añádela a tu pantalla de inicio'}
        </div>
      </div>
      <button onClick={() => { localStorage.setItem('pwa-dismissed', '1'); setDroid(false) }}
        style={closeBtn}>✕</button>
      <button className="btn btn-primary" style={{ whiteSpace:'nowrap', flexShrink:0 }}
        onClick={async () => {
          if (!prompt) return
          prompt.prompt()
          const { outcome } = await prompt.userChoice
          if (outcome === 'accepted') localStorage.setItem('pwa-installed', '1')
          setDroid(false)
        }}>
        {lang === 'en' ? 'Install' : 'Instalar'}
      </button>
    </div>
  )

  // ── iOS Safari banner ─────────────────────────
  if (showIOS) return (
    <div style={{ ...bannerStyle, flexDirection:'column', alignItems:'stretch', gap:10 }}>
      {/* Header row */}
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <img src="/logo.png" style={{ width:36, height:36, borderRadius:8, flexShrink:0 }} alt="" />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:700, fontSize:14 }}>
            {lang === 'en' ? 'Install HabitQuest' : 'Instala HabitQuest en tu iPhone'}
          </div>
        </div>
        <button onClick={() => { localStorage.setItem('ios-banner-dismissed', '1'); setIOS(false) }}
          style={closeBtn}>✕</button>
      </div>

      {/* Steps */}
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        <Step n={1} icon={<ShareIcon />}>
          {lang === 'en'
            ? <>Tap the <strong>Share</strong> button in Safari's toolbar</>
            : <>Pulsa el botón <strong>Compartir</strong> en la barra de Safari</>}
        </Step>
        <Step n={2} icon={<PlusSquareIcon />}>
          {lang === 'en'
            ? <>Select <strong>"Add to Home Screen"</strong></>
            : <>Selecciona <strong>"Añadir a pantalla de inicio"</strong></>}
        </Step>
      </div>
    </div>
  )

  return null
}

function Step({ n, icon, children }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, color:'var(--text2)' }}>
      <span style={{ fontFamily:'var(--mono)', fontSize:11, fontWeight:700, background:'var(--accent)', color:'var(--accent-fg)', borderRadius:'50%', width:20, height:20, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{n}</span>
      <span style={{ color:'var(--text3)', flexShrink:0 }}>{icon}</span>
      <span>{children}</span>
    </div>
  )
}

const PlusSquareIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0 }}>
    <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

const bannerStyle = {
  position:'fixed', bottom:80, left:16, right:16,
  background:'var(--panel)', border:'1px solid var(--accent)',
  borderRadius:16, padding:'14px 16px', zIndex:200,
  display:'flex', gap:12, alignItems:'center',
  boxShadow:'0 4px 24px rgba(0,0,0,0.4)',
  animation:'slideUp .25s ease',
}

const closeBtn = {
  background:'none', border:'none', color:'var(--text3)',
  fontSize:20, cursor:'pointer', flexShrink:0, lineHeight:1,
}
