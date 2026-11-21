import { useAuth } from './auth/auth-context'
import Login from './components/Login'
import SquadScreen from './components/SquadScreen'

function App() {
  const { user, loading, signOut } = useAuth()

  if (loading) {
    return <main className="grid min-h-dvh place-items-center text-text-muted">Cargando…</main>
  }
  if (!user) return <Login />

  return <SquadScreen onSignOut={signOut} />
}

export default App
