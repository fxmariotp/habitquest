import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { useGame } from './hooks/useGame'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = loading
  const [lang, setLang]       = useState('es')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  const game = useGame(session?.user?.id)

  // Sync lang from profile
  useEffect(() => {
    if (game.profile?.language) setLang(game.profile.language)
  }, [game.profile?.language])

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  if (session === undefined) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:13, color:'var(--text3)', letterSpacing:2 }}>LOADING...</div>
      </div>
    )
  }

  if (!session) {
    return <AuthPage lang={lang} setLang={setLang} />
  }

  return (
    <Dashboard
      game={game}
      userId={session.user.id}
      onLogout={handleLogout}
    />
  )
}
