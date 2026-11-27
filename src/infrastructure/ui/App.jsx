import { lazy, Suspense } from 'react'
import { Outlet, Route, Routes, useLocation } from 'react-router'
import { isStaff } from '../../domain/user'
import { useAuth } from './auth/auth-context'
import BottomNav from './components/BottomNav'
import Icon from './components/Icon'
import Login from './components/Login'
import NotFound from './components/NotFound'
import PlayerScreen from './components/PlayerScreen'
import SquadScreen from './components/SquadScreen'
import VoteScreen from './components/VoteScreen'
import { useAsync } from './use-async'
import { useUseCases } from './use-cases-context'

// El panel se descarga solo al entrar en él. Sin red (o tras un despliegue nuevo) la descarga falla: se dice.
const AdminRoutes = lazy(() => import('./components/admin/AdminRoutes').catch(() => ({ default: AdminUnavailable })))

function AdminUnavailable() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6">
      <p role="alert" className="type-small text-danger">
        No se pudo cargar el panel. Comprueba la conexión y recarga la página.
      </p>
    </main>
  )
}

/**
 * Cuántos compañeros te faltan por votar, para el punto de «Votar» y el aviso de la plantilla. Se vuelve a pedir al
 * entrar en la votación y al salir de ella, para que el punto desaparezca cuando ya has votado a todos.
 */
function usePendingVotes() {
  const { getVoteSession } = useUseCases()
  const onVote = useLocation().pathname === '/votar'
  const { data } = useAsync(getVoteSession, onVote ? 'voting' : 'elsewhere')
  return data?.reduce((n, match) => n + match.pending.length, 0) ?? 0
}

/** Marco de las pantallas con sesión: «Salir» arriba a la derecha, la pantalla y la barra flotante (ADR-0004). */
function AppShell({ onSignOut, staff }) {
  const pendingVotes = usePendingVotes()
  return (
    // pb: hueco para que la barra flotante no tape el final de la pantalla.
    <div className="pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-5xl justify-end px-4 pt-3">
        <button
          type="button"
          onClick={onSignOut}
          className="flex min-h-11 items-center gap-2 rounded-full px-3 type-small text-text-muted transition hover:bg-text/10 hover:text-text"
        >
          <Icon name="logout" />
          Salir
        </button>
      </div>
      <Outlet context={{ pendingVotes }} />
      <BottomNav staff={staff} pendingVotes={pendingVotes} />
    </div>
  )
}

function App() {
  const { user, role, loading, signOut } = useAuth()
  const staff = isStaff(role)

  if (loading) {
    return <main className="grid min-h-dvh place-items-center text-text-muted">Cargando…</main>
  }
  if (!user) return <Login />

  return (
    <Routes>
      <Route element={<AppShell onSignOut={signOut} staff={staff} />}>
        <Route index element={<SquadScreen />} />
        <Route path="jugador/:playerId" element={<PlayerScreen />} />
        <Route path="votar" element={<VoteScreen />} />
        {staff && (
          <Route
            path="admin/*"
            element={
              <Suspense fallback={<p className="px-4 py-6 text-center text-text-muted">Cargando…</p>}>
                <AdminRoutes role={role} userId={user.id} />
              </Suspense>
            }
          />
        )}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default App
