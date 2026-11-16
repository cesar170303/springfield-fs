import { useState } from 'react'
import { useUseCases } from '../use-cases-context'

export default function Login() {
  const { signInWithPassword, signUp, signInWithGoogle } = useUseCases()
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    // Los dos casos de uso devuelven ya el texto a mostrar (o null si todo fue bien).
    const text =
      mode === 'signin'
        ? (await signInWithPassword({ email, password })).error
        : (await signUp({ email, password })).message
    setBusy(false)
    setMessage(text ?? '')
  }

  async function handleGoogle() {
    const { error } = await signInWithGoogle()
    if (error) setMessage(error)
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-6 p-4">
      <img src="/escudo.png" alt="Escudo Springfield FS" width="120" height="120" />
      <h1 className="text-2xl font-bold text-yellow-400">Springfield FS</h1>

      <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col gap-3">
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded bg-zinc-900 p-3"
        />
        <input
          type="password"
          required
          minLength={6}
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded bg-zinc-900 p-3"
        />
        <button disabled={busy} className="rounded bg-yellow-400 p-3 font-bold text-black disabled:opacity-50">
          {mode === 'signin' ? 'Entrar' : 'Crear cuenta'}
        </button>
        <button type="button" onClick={handleGoogle} className="rounded border border-zinc-600 p-3">
          Continuar con Google
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          className="text-sm text-zinc-400 underline"
        >
          {mode === 'signin' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Entra'}
        </button>
        {message && (
          <p role="alert" className="text-sm text-red-400">
            {message}
          </p>
        )}
      </form>
    </main>
  )
}
