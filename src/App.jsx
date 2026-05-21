import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useGame } from './hooks/useGame'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import PublicProfile from './pages/PublicProfile'

export default function App() {
  const [session, setSession] = useState(undefined)
  const [theme, setTheme]     = useState(() => localStorage.getItem('hq_theme') || 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('hq_theme', theme)
  }, [theme])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  const game = useGame(session?.user?.id)

  // Sync theme from profile
  useEffect(() => {
    if (game.profile?.theme) setTheme(game.profile.theme)
  }, [game.profile?.theme])

  if (session === undefined) {
    return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text3)', fontFamily:'var(--mono)', fontSize:13, letterSpacing:2 }}>LOADING...</div>
  }

  return (
    <Routes>
      {/* Perfil público — accesible sin login */}
      <Route path="/u/:username" element={<PublicProfile />} />

      {/* App principal */}
      <Route path="*" element={
        !session
          ? <AuthPage theme={theme} setTheme={t => { setTheme(t); localStorage.setItem('hq_theme',t); document.documentElement.setAttribute('data-theme',t) }} />
          : <Dashboard game={game} userId={session.user.id} theme={theme}
              setTheme={t => { setTheme(t); game.updateProfile({ theme: t }); localStorage.setItem('hq_theme',t); document.documentElement.setAttribute('data-theme',t) }}
              onLogout={() => supabase.auth.signOut()} />
      } />
    </Routes>
  )
}
