import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { useGame } from './hooks/useGame'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'

export default function App() {
  const [session, setSession] = useState(undefined)
  const [lang, setLang]       = useState('es')
  const [theme, setTheme]     = useState(() => localStorage.getItem('hq_theme') || 'dark')

  // Apply theme to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('hq_theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  const game = useGame(session?.user?.id)

  useEffect(() => {
    if (game.profile?.language) setLang(game.profile.language)
  }, [game.profile?.language])

  if (session === undefined) {
    return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text3)', fontFamily:'var(--mono)', fontSize:13, letterSpacing:2 }}>LOADING...</div>
  }

  if (!session) {
    return <AuthPage lang={lang} setLang={setLang} theme={theme} toggleTheme={toggleTheme} />
  }

  return (
    <Dashboard
      game={game}
      userId={session.user.id}
      onLogout={() => supabase.auth.signOut()}
      theme={theme}
      toggleTheme={toggleTheme}
    />
  )
}
