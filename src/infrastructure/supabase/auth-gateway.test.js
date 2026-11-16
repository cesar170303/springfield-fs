import { describe, expect, it, vi } from 'vitest'
import { createSupabaseAuthGateway } from './auth-gateway'

// Cliente falso: solo la parte de `auth` que usa el gateway.
function setup(auth = {}) {
  const client = { auth }
  return { client, gateway: createSupabaseAuthGateway(client) }
}

const session = { user: { id: 'u1', email: 'jugador@example.com', app_metadata: {} }, access_token: 'x' }
const credentials = { email: 'jugador@example.com', password: 'secreto123' }

describe('gateway de auth de Supabase', () => {
  it('getSession devuelve solo id y correo del usuario', async () => {
    const { gateway } = setup({ getSession: vi.fn().mockResolvedValue({ data: { session } }) })

    expect(await gateway.getSession()).toEqual({ id: 'u1', email: 'jugador@example.com' })
  })

  it('getSession devuelve null si no hay sesión', async () => {
    const { gateway } = setup({ getSession: vi.fn().mockResolvedValue({ data: { session: null } }) })

    expect(await gateway.getSession()).toBeNull()
  })

  it('onSessionChange traduce cada cambio y permite darse de baja', () => {
    const unsubscribe = vi.fn()
    const onAuthStateChange = vi.fn().mockReturnValue({ data: { subscription: { unsubscribe } } })
    const { gateway } = setup({ onAuthStateChange })
    const listener = vi.fn()

    const stop = gateway.onSessionChange(listener)
    const emit = onAuthStateChange.mock.calls[0][0]
    emit('SIGNED_IN', session)
    emit('SIGNED_OUT', null)
    stop()

    expect(listener).toHaveBeenNthCalledWith(1, { id: 'u1', email: 'jugador@example.com' })
    expect(listener).toHaveBeenNthCalledWith(2, null)
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('signInWithPassword: sin error devuelve error null', async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({ data: { session }, error: null })
    const { gateway } = setup({ signInWithPassword })

    expect(await gateway.signInWithPassword(credentials)).toEqual({ error: null })
    expect(signInWithPassword).toHaveBeenCalledWith(credentials)
  })

  it('signInWithPassword: con error devuelve solo su mensaje', async () => {
    const { gateway } = setup({
      signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: { message: 'Invalid login credentials' } }),
    })

    expect(await gateway.signInWithPassword(credentials)).toEqual({ error: 'Invalid login credentials' })
  })

  it('signUp indica si el registro abrió sesión', async () => {
    const signUp = vi.fn().mockResolvedValue({ data: { session: null }, error: null })
    const { gateway } = setup({ signUp })

    expect(await gateway.signUp(credentials)).toEqual({ hasSession: false, error: null })
    expect(signUp).toHaveBeenCalledWith(credentials)
  })

  it('signUp con sesión', async () => {
    const { gateway } = setup({ signUp: vi.fn().mockResolvedValue({ data: { session }, error: null }) })

    expect(await gateway.signUp(credentials)).toEqual({ hasSession: true, error: null })
  })

  it('signUp con error devuelve su mensaje', async () => {
    const { gateway } = setup({
      signUp: vi.fn().mockResolvedValue({ data: {}, error: { message: 'User already registered' } }),
    })

    expect(await gateway.signUp(credentials)).toEqual({ hasSession: false, error: 'User already registered' })
  })

  it('signInWithGoogle redirige de vuelta a la app', async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({ error: null })
    const { gateway } = setup({ signInWithOAuth })

    expect(await gateway.signInWithGoogle()).toEqual({ error: null })
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  })

  it('signOut cierra la sesión en Supabase', async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null })
    const { gateway } = setup({ signOut })

    await gateway.signOut()

    expect(signOut).toHaveBeenCalledTimes(1)
  })
})
