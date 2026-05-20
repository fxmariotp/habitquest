let ctx = null
function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  return ctx
}

function beep(freq, dur, type = 'square', vol = 0.12) {
  try {
    const c = getCtx()
    const o = c.createOscillator()
    const g = c.createGain()
    o.connect(g); g.connect(c.destination)
    o.type = type; o.frequency.value = freq
    g.gain.setValueAtTime(vol, c.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur)
    o.start(); o.stop(c.currentTime + dur)
  } catch (e) {}
}

export function playSound(type) {
  if (type === 'complete') {
    beep(523, .08); setTimeout(() => beep(659, .08), 90); setTimeout(() => beep(784, .12), 180)
  }
  if (type === 'levelup') {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, .12, 'square', .12), i * 100))
  }
  if (type === 'achievement') {
    beep(659, .06); setTimeout(() => beep(784, .06), 70); setTimeout(() => beep(1047, .15), 140)
  }
  if (type === 'goal') {
    [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => beep(f, .1, 'square', .1), i * 80))
  }
}
