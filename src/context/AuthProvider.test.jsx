import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './auth-context'

// Falseamos solo lo que AuthProvider usa de Supabase: auth.* y from('profiles').select().eq().single().
const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signOut: vi.fn(),
  single: vi.fn(),
  unsubscribe: vi.fn(),
}))
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
      signOut: mocks.signOut,
    },
    from: () => ({ select: () => ({ eq: () => ({ single: mocks.single }) }) }),
  },
}))

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

function renderProvider() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )
}

const session = { user: { id: 'u1', email: 'jugador@example.com' } }

beforeEach(() => {
  vi.resetAllMocks()
  mocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: mocks.unsubscribe } } })
})

describe('AuthProvider', () => {
  it('sin sesión: termina de cargar sin usuario ni rol y no pide perfil', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null } })
    renderProvider()

    expect(screen.getByText('loading')).toBeInTheDocument()
    expect(await screen.findByText('user=none role=none')).toBeInTheDocument()
    expect(mocks.single).not.toHaveBeenCalled()
  })

  it('con sesión: sigue cargando hasta tener el perfil y entonces expone el rol', async () => {
    let resolveProfile
    mocks.getSession.mockResolvedValue({ data: { session } })
    mocks.single.mockReturnValue(new Promise((resolve) => (resolveProfile = resolve)))
    renderProvider()

    await waitFor(() => expect(mocks.single).toHaveBeenCalled())
    expect(screen.getByText('loading')).toBeInTheDocument() // hay sesión pero aún no hay rol

    await act(async () => resolveProfile({ data: { id: 'u1', role: 'admin' } }))

    expect(await screen.findByText('user=jugador@example.com role=admin')).toBeInTheDocument()
  })

  it('al cerrarse la sesión (evento de Supabase) deja de haber usuario y rol', async () => {
    mocks.getSession.mockResolvedValue({ data: { session } })
    mocks.single.mockResolvedValue({ data: { id: 'u1', role: 'admin' } })
    renderProvider()
    await screen.findByText('user=jugador@example.com role=admin')

    const onChange = mocks.onAuthStateChange.mock.calls[0][0]
    act(() => onChange('SIGNED_OUT', null))

    expect(await screen.findByText('user=none role=none')).toBeInTheDocument()
  })

  it('signOut delega en Supabase', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null } })
    renderProvider()

    await userEvent.click(await screen.findByRole('button', { name: 'logout' }))

    expect(mocks.signOut).toHaveBeenCalledTimes(1)
  })

  it('cancela la suscripción de auth al desmontarse', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null } })
    const { unmount } = renderProvider()
    await screen.findByText('user=none role=none')

    unmount()

    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1)
  })
})
