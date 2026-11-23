import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import App from './App'
import { AuthContext } from './auth/auth-context'
import { UseCasesContext } from './use-cases-context'

function renderApp(auth = {}, url = '/') {
  const value = {
    user: null,
    profile: null,
    role: null,
    loading: false,
    signOut: vi.fn(),
    ...auth,
  }
  // Casos de uso falsos para la plantilla y la ficha; el login no llega a usar los suyos.
  const useCases = {
    getSquadFilters: vi.fn().mockResolvedValue({ seasons: [], competitions: [], initialSeasonId: null }),
    getSquadStats: vi.fn(),
    getPlayerSheet: vi.fn().mockResolvedValue({ player: null, timeline: [], matches: [] }),
  }
  render(
    <UseCasesContext.Provider value={useCases}>
      <AuthContext.Provider value={value}>
        <MemoryRouter initialEntries={[url]}>
          <App />
        </MemoryRouter>
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

  it('cierra la sesión con «Salir», que está fuera de la barra de navegación', async () => {
    const auth = renderApp({ user: { email: 'jugador@example.com' }, role: 'player' })

    const nav = await screen.findByRole('navigation', { name: 'Principal' })
    expect(within(nav).queryByRole('button', { name: 'Salir' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Salir' }))

    expect(auth.signOut).toHaveBeenCalledTimes(1)
  })

  it('«Salir» también está en la ficha', async () => {
    renderApp({ user: { email: 'jugador@example.com' }, role: 'player' }, '/jugador/7')

    expect(await screen.findByRole('button', { name: 'Salir' })).toBeInTheDocument()
  })

  it('en /jugador/:id enseña la ficha, con un enlace para volver a la plantilla', async () => {
    renderApp({ user: { email: 'jugador@example.com' }, role: 'player' }, '/jugador/7?temporada=2')

    expect(await screen.findByRole('link', { name: 'Volver a la plantilla' })).toHaveAttribute('href', '/?temporada=2')
    expect(await screen.findByText('Aún no hay ninguna temporada.')).toBeInTheDocument()
  })

  it('una dirección que no existe lo dice y enlaza a la plantilla', async () => {
    renderApp({ user: { email: 'jugador@example.com' }, role: 'player' }, '/no-existe')

    expect(await screen.findByRole('heading', { name: 'Esta página no existe' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a la plantilla' })).toHaveAttribute('href', '/')
  })

  it.each(['admin', 'superadmin'])('un %s ve «Admin» en la barra y entra en el panel', async (role) => {
    renderApp({ user: { email: 'staff@example.com' }, role })

    await userEvent.click(await screen.findByRole('link', { name: 'Admin' }))

    expect(await screen.findByRole('heading', { name: 'Panel' })).toBeInTheDocument()
  })

  it.each(['player', 'viewer'])('un %s no ve «Admin», y en /admin lee que la página no existe', async (role) => {
    renderApp({ user: { email: 'jugador@example.com' }, role }, '/admin')

    expect(await screen.findByRole('heading', { name: 'Esta página no existe' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument()
  })

  it('una dirección del panel que no existe también lo dice', async () => {
    renderApp({ user: { email: 'staff@example.com' }, role: 'admin' }, '/admin/no-existe')

    expect(await screen.findByRole('heading', { name: 'Esta página no existe' })).toBeInTheDocument()
  })

  it('sin sesión, cualquier dirección enseña el login', () => {
    renderApp({}, '/jugador/7')

    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
  })
})
