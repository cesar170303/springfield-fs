import { useState } from 'react'
import { useUseCases } from '../use-cases-context'
import StripeField from './StripeField'

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
    <main className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden px-4 py-8">
      <StripeField />
      {/* Tarjeta de cristal centrada sobre el campo de rayas. */}
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl bg-linear-to-r from-text/10 to-surface p-8 shadow-2xl backdrop-blur-sm"
      >
        <img
          src="/pwa-512x512.png"
          alt="Escudo Springfield FS"
          width="48"
          height="48"
          className="size-12 rounded-full bg-text/20 shadow-lg"
        />
        <h1 className="type-title text-center">Springfield FS</h1>
        <div className="flex w-full flex-col gap-3">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="Correo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl bg-text/10 px-5 py-3 text-sm placeholder:text-text-muted"
          />
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl bg-text/10 px-5 py-3 text-sm placeholder:text-text-muted"
          />
          {message && (
            <p role="alert" className="type-small text-danger">
              {message}
            </p>
          )}
        </div>
        <hr className="w-full border-line" />
        <div className="flex w-full flex-col gap-3">
          <button
            disabled={busy}
            className="w-full rounded-full bg-accent px-5 py-3 text-sm font-bold text-on-accent transition hover:brightness-110 disabled:opacity-50"
          >
            {mode === 'signin' ? 'Entrar' : 'Crear cuenta'}
          </button>
          <button
            type="button"
            onClick={handleGoogle}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-linear-to-b from-surface to-line px-5 py-3 text-sm font-medium shadow transition hover:brightness-110"
          >
            <img src="/google.svg" alt="" width="20" height="20" />
            Continuar con Google
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="type-small text-center text-text-muted underline hover:text-text"
          >
            {mode === 'signin' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Entra'}
          </button>
        </div>
      </form>
    </main>
  )
}
