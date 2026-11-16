import { describe, expect, it, vi } from 'vitest'
import { createAuthUseCases } from './auth'

// Fakes en memoria: cumplen los ports sin tocar Supabase.
function setup(overrides = {}) {
  const authGateway = {
    getSession: vi.fn().mockResolvedValue(null),
    onSessionChange: vi.fn().mockReturnValue(() => {}),
    signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
    signUp: vi.fn().mockResolvedValue({ hasSession: true, error: null }),
    signInWithGoogle: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
  const profileRepository = { getById: vi.fn().mockResolvedValue(null), ...overrides }
  return { authGateway, profileRepository, useCases: createAuthUseCases({ authGateway, profileRepository }) }
}

const credentials = { email: 'jugador@example.com', password: 'secreto123' }

describe('casos de uso de auth', () => {
  it('getCurrentSession devuelve el usuario de la sesión', async () => {
    const user = { id: 'u1', email: 'jugador@example.com' }
    const { useCases } = setup({ getSession: vi.fn().mockResolvedValue(user) })

    expect(await useCases.getCurrentSession()).toEqual(user)
  })

  it('watchSession avisa de los cambios y devuelve cómo darse de baja', () => {
    const unsubscribe = vi.fn()
    const { useCases, authGateway } = setup({ onSessionChange: vi.fn().mockReturnValue(unsubscribe) })
    const listener = vi.fn()

    const stop = useCases.watchSession(listener)

    expect(authGateway.onSessionChange).toHaveBeenCalledWith(listener)
    expect(stop).toBe(unsubscribe)
  })

  it('getProfile pide el perfil de ese usuario', async () => {
    const profile = { id: 'u1', email: 'jugador@example.com', fullName: 'Jugador', role: 'admin' }
    const { useCases, profileRepository } = setup({ getById: vi.fn().mockResolvedValue(profile) })

    expect(await useCases.getProfile('u1')).toEqual(profile)
    expect(profileRepository.getById).toHaveBeenCalledWith('u1')
  })

  it('signInWithPassword entra con las credenciales y devuelve el error, si lo hay', async () => {
    const { useCases, authGateway } = setup({
      signInWithPassword: vi.fn().mockResolvedValue({ error: 'Invalid login credentials' }),
    })

    expect(await useCases.signInWithPassword(credentials)).toEqual({ error: 'Invalid login credentials' })
    expect(authGateway.signInWithPassword).toHaveBeenCalledWith(credentials)
  })

  it('signUp: con sesión, el usuario ya está dentro', async () => {
    const { useCases, authGateway } = setup()

    expect(await useCases.signUp(credentials)).toEqual({ status: 'signed-in', message: null })
    expect(authGateway.signUp).toHaveBeenCalledWith(credentials)
  })

  it('signUp: sin sesión, hay que confirmar el correo', async () => {
    const { useCases } = setup({ signUp: vi.fn().mockResolvedValue({ hasSession: false, error: null }) })

    expect(await useCases.signUp(credentials)).toEqual({
      status: 'confirmation-required',
      message: 'Revisa tu correo para confirmar la cuenta.',
    })
  })

  it('signUp: con error, devuelve su mensaje', async () => {
    const { useCases } = setup({
      signUp: vi.fn().mockResolvedValue({ hasSession: false, error: 'User already registered' }),
    })

    expect(await useCases.signUp(credentials)).toEqual({ status: 'error', message: 'User already registered' })
  })

  it('signInWithGoogle devuelve el error, si lo hay', async () => {
    const { useCases } = setup({ signInWithGoogle: vi.fn().mockResolvedValue({ error: 'provider disabled' }) })

    expect(await useCases.signInWithGoogle()).toEqual({ error: 'provider disabled' })
  })

  it('signOut cierra la sesión', async () => {
    const { useCases, authGateway } = setup()

    await useCases.signOut()

    expect(authGateway.signOut).toHaveBeenCalledTimes(1)
  })
})
