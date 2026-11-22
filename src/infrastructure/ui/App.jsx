import { Outlet, Route, Routes } from 'react-router'
import { useAuth } from './auth/auth-context'
import BottomNav from './components/BottomNav'
import Login from './components/Login'
import NotFound from './components/NotFound'
import PlayerScreen from './components/PlayerScreen'
import SquadScreen from './components/SquadScreen'

/** Marco de las pantallas con sesión: la pantalla y, debajo, la barra fija (ADR-0004). */
function AppShell({ onSignOut }) {
  return (
    // pb: hueco para que la barra flotante no tape el final de la pantalla.
    <div className="pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
      <Outlet />
      <BottomNav onSignOut={onSignOut} />
    </div>
  )
}

function App() {
  const { user, loading, signOut } = useAuth()

  if (loading) {
    return <main className="grid min-h-dvh place-items-center text-text-muted">Cargando…</main>
  }
  if (!user) return <Login />

  return (
    <Routes>
      <Route element={<AppShell onSignOut={signOut} />}>
        <Route index element={<SquadScreen />} />
        <Route path="jugador/:playerId" element={<PlayerScreen />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default App
