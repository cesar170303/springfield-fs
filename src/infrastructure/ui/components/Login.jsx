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
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-4">
      <img src="/pwa-512x512.png" alt="Escudo Springfield FS" width="120" height="120" />
      <h1 className="type-display text-center">Springfield FS</h1>

      <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col gap-3">
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-sm border border-border bg-surface p-3 placeholder:text-text-muted"
        />
        <input
          type="password"
          required
          minLength={6}
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-sm border border-border bg-surface p-3 placeholder:text-text-muted"
        />
        <button disabled={busy} className="rounded-md bg-accent p-3 font-bold text-on-accent disabled:opacity-50">
          {mode === 'signin' ? 'Entrar' : 'Crear cuenta'}
        </button>
        <button type="button" onClick={handleGoogle} className="rounded-md border border-border p-3">
          Continuar con Google
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          className="type-small text-accent-text underline"
        >
          {mode === 'signin' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Entra'}
        </button>
        {message && (
          <p role="alert" className="type-small text-danger">
            {message}
          </p>
        )}
      </form>
    </main>
  )
}
