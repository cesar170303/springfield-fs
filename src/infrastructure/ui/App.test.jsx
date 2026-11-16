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
  render(
    // Login (hijo de App) pide los casos de uso; aquí no se llega a usar ninguno.
    <UseCasesContext.Provider value={{}}>
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

  it('saluda con el nombre del perfil y muestra el rol', () => {
    renderApp({
      user: { email: 'jugador@example.com' },
      profile: { fullName: 'Jugador' },
      role: 'superadmin',
    })

    expect(screen.getByRole('heading', { name: 'Hola, Jugador' })).toBeInTheDocument()
    expect(screen.getByText('superadmin')).toBeInTheDocument()
  })

  it('usa el correo si el perfil no tiene nombre', () => {
    renderApp({ user: { email: 'jugador@example.com' }, profile: { fullName: null }, role: 'player' })

    expect(screen.getByRole('heading', { name: 'Hola, jugador@example.com' })).toBeInTheDocument()
  })

  it('indica "sin perfil" cuando el usuario no tiene rol', () => {
    renderApp({ user: { email: 'jugador@example.com' } })

    expect(screen.getByText('sin perfil')).toBeInTheDocument()
  })

  it('cierra la sesión al pulsar Salir', async () => {
    const auth = renderApp({ user: { email: 'jugador@example.com' }, role: 'player' })

    await userEvent.click(screen.getByRole('button', { name: 'Salir' }))

    expect(auth.signOut).toHaveBeenCalledTimes(1)
  })
})
