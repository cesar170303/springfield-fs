import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { AuthContext } from './auth/auth-context'
import { UseCasesContext } from './use-cases-context'

function renderApp(auth = {}) {
  const value = {
    user: null,
    profile: null,
    role: null,
    loading: false,
    signOut: vi.fn(),
    ...auth,
  }
  // Casos de uso falsos para la plantilla; el login no llega a usar los suyos.
  const useCases = {
    getSquadFilters: vi.fn().mockResolvedValue({ seasons: [], competitions: [], initialSeasonId: null }),
    getSquadStats: vi.fn(),
  }
  render(
    <UseCasesContext.Provider value={useCases}>
      <AuthContext.Provider value={value}>
        <App />
      </AuthContext.Provider>
    </UseCasesContext.Provider>,
  )
  return value
}

describe('App', () => {
  it('muestra "Cargando…" mientras la sesión y el perfil no están listos', () => {
    renderApp({ loading: true })

    expect(screen.getByText('Cargando…')).toBeInTheDocument()
  })

  it('no enseña el formulario de login mientras carga', () => {
    renderApp({ loading: true })

    expect(screen.queryByRole('button', { name: 'Entrar' })).not.toBeInTheDocument()
  })

  it('muestra el login si no hay usuario', () => {
    renderApp()

    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('con sesión, enseña la plantilla', async () => {
    renderApp({ user: { email: 'jugador@example.com' }, role: 'player' })

    expect(await screen.findByRole('heading', { name: 'Plantilla' })).toBeInTheDocument()
  })

  it('cierra la sesión al pulsar Salir', async () => {
    const auth = renderApp({ user: { email: 'jugador@example.com' }, role: 'player' })

    await userEvent.click(await screen.findByRole('button', { name: 'Salir' }))

    expect(auth.signOut).toHaveBeenCalledTimes(1)
  })
})
