import { displayName } from '../../domain/user'
import { useAuth } from './auth/auth-context'
import Login from './components/Login'

function App() {
  const { user, profile, role, loading, signOut } = useAuth()

  if (loading) {
    return <main className="grid min-h-dvh place-items-center text-text-muted">Cargando…</main>
  }
  if (!user) return <Login />

  // Pantalla provisional: el paso 3 pondrá aquí la lista de la plantilla.
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-4 text-center">
      <img src="/pwa-512x512.png" alt="Escudo Springfield FS" width="120" height="120" />
      <h1 className="type-display max-w-full wrap-anywhere">
        Hola, {displayName({ fullName: profile?.fullName, email: user.email })}
      </h1>
      <p className="text-text-muted">
        Rol: <strong className="font-bold text-text">{role ?? 'sin perfil'}</strong>
      </p>
      <button onClick={signOut} className="rounded-md border border-border px-4 py-2">
        Salir
      </button>
    </main>
  )
}

export default App
