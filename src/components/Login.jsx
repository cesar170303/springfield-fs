import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    const { data, error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (error) setMessage(error.message)
    // Si la confirmación de email está activa, signUp no devuelve sesión.
    else if (mode === 'signup' && !data.session) setMessage('Revisa tu correo para confirmar la cuenta.')
  }

  async function handleGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) setMessage(error.message)
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
        {message && <p role="alert" className="text-sm text-red-400">{message}</p>}
      </form>
    </main>
  )
}
