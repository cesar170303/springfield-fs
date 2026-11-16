import { describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './auth-context'
import { UseCasesContext } from '../use-cases-context'

// Casos de uso falsos: el provider no sabe que existe Supabase.
function fakeUseCases(overrides = {}) {
  return {
    getCurrentSession: vi.fn().mockResolvedValue(null),
    watchSession: vi.fn().mockReturnValue(() => {}),
    getProfile: vi.fn().mockResolvedValue(null),
    signOut: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function Probe() {
  const { loading, user, role, signOut } = useAuth()
  if (loading) return <p>loading</p>
  return (
    <>
      <p>
        user={user?.email ?? 'none'} role={role ?? 'none'}
      </p>
      <button onClick={signOut}>logout</button>
    </>
  )
}

function renderProvider(useCases) {
  return render(
    <UseCasesContext.Provider value={useCases}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </UseCasesContext.Provider>,
  )
}

const user = { id: 'u1', email: 'jugador@example.com' }
const profile = { id: 'u1', email: 'jugador@example.com', fullName: 'Jugador', role: 'admin' }

describe('AuthProvider', () => {
  it('sin sesión: termina de cargar sin usuario ni rol y no pide perfil', async () => {
    const useCases = fakeUseCases()
    renderProvider(useCases)

    expect(screen.getByText('loading')).toBeInTheDocument()
    expect(await screen.findByText('user=none role=none')).toBeInTheDocument()
    expect(useCases.getProfile).not.toHaveBeenCalled()
  })

  it('con sesión: sigue cargando hasta tener el perfil y entonces expone el rol', async () => {
    let resolveProfile
    const useCases = fakeUseCases({
      getCurrentSession: vi.fn().mockResolvedValue(user),
      getProfile: vi.fn().mockReturnValue(new Promise((resolve) => (resolveProfile = resolve))),
    })
    renderProvider(useCases)

    await waitFor(() => expect(useCases.getProfile).toHaveBeenCalledWith('u1'))
    expect(screen.getByText('loading')).toBeInTheDocument() // hay sesión pero aún no hay rol

    await act(async () => resolveProfile(profile))

    expect(await screen.findByText('user=jugador@example.com role=admin')).toBeInTheDocument()
  })

  it('con sesión pero sin perfil: termina de cargar sin rol', async () => {
    renderProvider(fakeUseCases({ getCurrentSession: vi.fn().mockResolvedValue(user) }))

    expect(await screen.findByText('user=jugador@example.com role=none')).toBeInTheDocument()
  })

  it('al cerrarse la sesión deja de haber usuario y rol', async () => {
    const useCases = fakeUseCases({
      getCurrentSession: vi.fn().mockResolvedValue(user),
      getProfile: vi.fn().mockResolvedValue(profile),
    })
    renderProvider(useCases)
    await screen.findByText('user=jugador@example.com role=admin')

    const onChange = useCases.watchSession.mock.calls[0][0]
    act(() => onChange(null))

    expect(await screen.findByText('user=none role=none')).toBeInTheDocument()
  })

  it('signOut delega en el caso de uso', async () => {
    const useCases = fakeUseCases()
    renderProvider(useCases)

    await userEvent.click(await screen.findByRole('button', { name: 'logout' }))

    expect(useCases.signOut).toHaveBeenCalledTimes(1)
  })

  it('deja de escuchar la sesión al desmontarse', async () => {
    const stop = vi.fn()
    const { unmount } = renderProvider(fakeUseCases({ watchSession: vi.fn().mockReturnValue(stop) }))
    await screen.findByText('user=none role=none')

    unmount()

    expect(stop).toHaveBeenCalledTimes(1)
  })
})
