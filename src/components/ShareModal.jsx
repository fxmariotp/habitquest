import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import html2canvas from 'html2canvas'
import { getClass } from '../lib/game'

function ShareContent({ profile, habits, theme }) {
  const dark = theme === 'dark'
  const bg         = dark ? '#0c0c0c' : '#ffffff'
  const textColor  = dark ? '#e5e5e5' : '#111111'
  const subColor   = dark ? '#777777' : '#888888'
  const borderClr  = dark ? '#1e1e1e' : '#eeeeee'
  const doneColor  = dark ? '#484848' : '#bbbbbb'
  const cls        = getClass(profile.level || 1)
  const doneCount  = habits.filter(h => h.done_today).length
  const today      = new Date().toLocaleDateString('es-ES', {
    weekday:'long', year:'numeric', month:'long', day:'numeric'
  })

  return (
    <div style={{ width:400, background:bg, fontFamily:'"Inter", system-ui, -apple-system, sans-serif', padding:32, boxSizing:'border-box' }}>
      <div style={{ fontFamily:'monospace', fontSize:12, fontWeight:700, letterSpacing:3, color:subColor, marginBottom:28 }}>
        ⚔ HABITQUEST
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:26 }}>
        <div style={{ fontSize:52, lineHeight:1 }}>{profile.avatar_emoji || '🧙'}</div>
        <div>
          <div style={{ fontSize:18, fontWeight:800, color:textColor, marginBottom:2 }}>
            {profile.display_name || profile.username}
          </div>
          <div style={{ fontSize:12, color:subColor, marginBottom:6 }}>@{profile.username}</div>
          <span style={{ background:'#7c3aed', color:'#fff', fontFamily:'monospace', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10 }}>
            {cls.displayName} · LV {profile.level}
          </span>
        </div>
      </div>
      <div style={{ height:1, background:borderClr, marginBottom:18 }} />
      <div style={{ fontFamily:'monospace', fontSize:9, letterSpacing:2, color:subColor, marginBottom:14 }}>
        MISIONES DE HOY · {doneCount}/{habits.length}
      </div>
      {habits.map((h, i) => (
        <div key={h.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 0', borderBottom: i < habits.length - 1 ? `1px solid ${borderClr}` : 'none' }}>
          <div style={{ width:22, height:22, borderRadius:'50%', flexShrink:0, border: h.done_today ? 'none' : `2px solid ${subColor}`, background: h.done_today ? '#7c3aed' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11, fontWeight:700 }}>
            {h.done_today ? '✓' : ''}
          </div>
          <span style={{ fontSize:15, fontWeight:600, color: h.done_today ? doneColor : textColor, textDecoration: h.done_today ? 'line-through' : 'none' }}>
            {h.name}
          </span>
        </div>
      ))}
      <div style={{ marginTop:20, fontFamily:'monospace', fontSize:11, color:subColor, textTransform:'capitalize' }}>
        {today}
      </div>
    </div>
  )
}

function canvasToBlob(canvas) {
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
}

export default function ShareModal({ profile, habits, theme, lang, onClose }) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)
  const captureRef = useRef()

  const shareUrl = profile?.username
    ? `${window.location.origin}/u/${profile.username}/habits`
    : null

  function flash(key) { setDone(key); setTimeout(() => setDone(null), 2200) }

  async function getCanvas() {
    if (!captureRef.current) return null
    return html2canvas(captureRef.current, { scale:2, logging:false, useCORS:true, allowTaint:true })
  }

  function downloadBlob(blob) {
    const today = new Date().toISOString().split('T')[0]
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `habitquest-${today}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function handleCopyImage() {
    setBusy(true)
    try {
      const canvas = await getCanvas()
      if (!canvas) return
      const blob = await canvasToBlob(canvas)
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        flash('img')
      } catch {
        downloadBlob(blob)
      }
    } finally { setBusy(false) }
  }

  async function handleDownload() {
    setBusy(true)
    try {
      const canvas = await getCanvas()
      if (!canvas) return
      downloadBlob(await canvasToBlob(canvas))
    } finally { setBusy(false) }
  }

  async function handleCopyLink() {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    flash('link')
  }

  return (
    <>
      <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal" style={{ maxWidth:420 }}>
          <div className="modal-handle" />
          <div className="modal-title">
            {lang === 'en' ? 'Share Habits' : 'Compartir hábitos'}
          </div>

          {/* Preview */}
          <div style={{ display:'flex', justifyContent:'center', marginBottom:20 }}>
            <div style={{ borderRadius:10, border:'1px solid var(--border)', overflow:'hidden' }}>
              <div style={{ zoom:0.65 }}>
                <ShareContent profile={profile} habits={habits} theme={theme} />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
            <button className="btn btn-primary" onClick={handleCopyImage} disabled={busy}
              style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:6 }}>
              {done === 'img' ? '✓ Copiado' : '📋 Copiar imagen'}
            </button>

            {shareUrl ? (
              <button className="btn btn-ghost" onClick={handleCopyLink}
                style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:6 }}>
                {done === 'link' ? '✓ Enlace copiado' : '🔗 Copiar enlace'}
              </button>
            ) : (
              <p style={{ margin:0, fontSize:12, color:'var(--text3)', textAlign:'center', padding:'4px 0' }}>
                {lang === 'en'
                  ? 'Set a username in your profile to share a link'
                  : 'Configura un username en tu perfil para compartir enlace'}
              </p>
            )}

            <button className="btn btn-ghost" onClick={handleDownload} disabled={busy}
              style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:6 }}>
              ⬇ Descargar imagen
            </button>
          </div>

          <div className="modal-actions" style={{ justifyContent:'center' }}>
            <button className="btn btn-ghost" onClick={onClose}>
              {lang === 'en' ? 'Close' : 'Cerrar'}
            </button>
          </div>
        </div>
      </div>

      {/* Off-screen element used as html2canvas source */}
      {createPortal(
        <div ref={captureRef} style={{ position:'absolute', left:'-9999px', top:0, pointerEvents:'none' }}>
          <ShareContent profile={profile} habits={habits} theme={theme} />
        </div>,
        document.body
      )}
    </>
  )
}
