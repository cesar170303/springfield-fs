import { useAuth } from './context/auth-context'
import Login from './components/Login'

function App() {
  const { user, profile, role, loading, signOut } = useAuth()

  if (loading) {
    return <main className="min-h-screen bg-black text-white grid place-items-center">Cargando…</main>
  }
  if (!user) return <Login />

  // Pantalla provisional: el paso 3 pondrá aquí la lista de la plantilla.
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
      <img src="/escudo.png" alt="Escudo Springfield FS" width="120" height="120" />
      <h1 className="text-2xl font-bold text-yellow-400">Hola, {profile?.full_name ?? user.email}</h1>
      <p>Rol: <strong>{role ?? 'sin perfil'}</strong></p>
      <button onClick={signOut} className="rounded border border-zinc-600 px-4 py-2">Salir</button>
    </main>
  )
}

export default App
