import { useState, useEffect } from 'react'

export default function InstallPWA({ lang }) {
  const [prompt, setPrompt] = useState(null)
  const [show, setShow]     = useState(false)

  useEffect(() => {
    if (localStorage.getItem('pwa-dismissed')) return

    const handler = (e) => {
      e.preventDefault()
      setPrompt(e)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!show) return null

  return (
    <div style={{
      position:'fixed', bottom:80, left:16, right:16,
      background:'var(--panel)', border:'1px solid var(--accent)',
      borderRadius:16, padding:'14px 16px', zIndex:200,
      display:'flex', gap:12, alignItems:'center',
      boxShadow:'0 4px 24px rgba(0,0,0,0.4)'
    }}>
      <img src="/logo.png" style={{ width:40, height:40, borderRadius:8, flexShrink:0 }} alt="HabitQuest" />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:700, fontSize:14 }}>
          {lang === 'en' ? 'Install HabitQuest' : 'Instalar HabitQuest'}
        </div>
        <div style={{ fontSize:12, color:'var(--text2)' }}>
          {lang === 'en' ? 'Add to your home screen' : 'Añádela a tu pantalla de inicio'}
        </div>
      </div>
      <button
        onClick={() => { localStorage.setItem('pwa-dismissed', '1'); setShow(false) }}
        style={{ background:'none', border:'none', color:'var(--text3)', fontSize:20, cursor:'pointer', flexShrink:0, lineHeight:1 }}>
        ✕
      </button>
      <button
        className="btn btn-primary"
        style={{ whiteSpace:'nowrap', flexShrink:0 }}
        onClick={async () => {
          if (!prompt) return
          prompt.prompt()
          const { outcome } = await prompt.userChoice
          if (outcome === 'accepted') localStorage.setItem('pwa-installed', '1')
          setShow(false)
        }}>
        {lang === 'en' ? 'Install' : 'Instalar'}
      </button>
    </div>
  )
}
