import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import AccountsAdmin from './AccountsAdmin'
import { UseCasesContext } from '../../use-cases-context'

const ACCOUNTS = [
  { id: 'u-3', name: 'Ana Ejemplo', email: 'ana@example.com', role: 'admin', player: 'Ana', canChange: true },
  { id: 'u-5', name: 'Benito Ejemplo', email: 'benito@example.com', role: 'viewer', player: null, canChange: true },
  { id: 'u-4', name: 'Otro Super', email: 'super@example.com', role: 'superadmin', player: null, canChange: false },
  { id: 'u-6', name: 'Carla Ejemplo', email: 'carla@example.com', role: 'player', player: 'Carla', canChange: true },
]

function renderAccounts(overrides = {}) {
  const useCases = {
    listAccounts: vi.fn().mockResolvedValue(ACCOUNTS),
    makeAdmin: vi.fn().mockResolvedValue(),
    removeAdmin: vi.fn().mockResolvedValue(),
    ...overrides,
  }
  render(
    <UseCasesContext.Provider value={useCases}>
      <MemoryRouter initialEntries={['/admin/usuarios']}>
        <AccountsAdmin currentUserId="me" />
      </MemoryRouter>
    </UseCasesContext.Provider>,
  )
  return useCases
}

const row = (name) => screen.getByText(name).closest('li')

describe('AccountsAdmin', () => {
  it('lista las cuentas con su correo, su rol y su ficha vinculada', async () => {
    const useCases = renderAccounts()

    await screen.findByText('Ana Ejemplo')
    expect(row('Ana Ejemplo')).toHaveTextContent(/ana@example\.com.*Admin.*Ficha: Ana/)
    expect(row('Benito Ejemplo')).toHaveTextContent(/benito@example\.com.*Viewer/)
    expect(row('Otro Super')).toHaveTextContent('Superadmin')
    expect(useCases.listAccounts).toHaveBeenCalledWith('me')
  })

  it('el rol va en una pastilla de color y la ficha con su camiseta', async () => {
    renderAccounts()

    await screen.findByText('Ana Ejemplo')
    expect(within(row('Ana Ejemplo')).getByText('Admin')).toHaveClass('bg-accent')
    expect(within(row('Otro Super')).getByText('Superadmin')).toHaveClass('bg-accent')
    expect(within(row('Carla Ejemplo')).getByText('Jugador')).toHaveClass('bg-line')
    expect(within(row('Benito Ejemplo')).getByText('Viewer')).toHaveClass('bg-line')
    const ficha = within(row('Ana Ejemplo')).getByText('Ficha:', { exact: false }).parentElement
    expect(ficha).toHaveTextContent('Ficha: Ana')
    expect(ficha.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('«Hacer admin» es azul y «Quitar admin» rojo', async () => {
    renderAccounts()

    await screen.findByText('Ana Ejemplo')
    expect(within(row('Benito Ejemplo')).getByRole('button', { name: 'Hacer admin' })).toHaveClass('bg-accent')
    expect(within(row('Ana Ejemplo')).getByRole('button', { name: 'Quitar admin' })).toHaveClass(
      'text-danger',
      'border-danger',
    )
  })

  it('a quien no es admin, «Hacer admin» con confirmación', async () => {
    const useCases = renderAccounts()

    await screen.findByText('Benito Ejemplo')
    await userEvent.click(within(row('Benito Ejemplo')).getByRole('button', { name: 'Hacer admin' }))
    expect(screen.getByText('¿Hacer admin a Benito Ejemplo? Podrá gestionar todo el panel.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sí, hacer admin' }))

    expect(useCases.makeAdmin).toHaveBeenCalledWith('u-5')
    expect(await screen.findByRole('status')).toHaveTextContent('Benito Ejemplo ya es admin.')
    expect(useCases.listAccounts).toHaveBeenCalledTimes(2)
  })

  it('a un admin, «Quitar admin» con confirmación; vuelve a jugador si tiene ficha', async () => {
    const useCases = renderAccounts()

    await screen.findByText('Ana Ejemplo')
    await userEvent.click(within(row('Ana Ejemplo')).getByRole('button', { name: 'Quitar admin' }))
    expect(screen.getByText('¿Quitar el admin a Ana Ejemplo? Vuelve a jugador.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sí, quitar admin' }))

    expect(useCases.removeAdmin).toHaveBeenCalledWith(ACCOUNTS[0])
    expect(await screen.findByRole('status')).toHaveTextContent('Ana Ejemplo ya no es admin.')
  })

  it('sin ficha, al quitar el admin vuelve a viewer', async () => {
    renderAccounts({
      listAccounts: vi.fn().mockResolvedValue([{ ...ACCOUNTS[0], player: null }]),
    })

    await userEvent.click(await screen.findByRole('button', { name: 'Quitar admin' }))

    expect(screen.getByText('¿Quitar el admin a Ana Ejemplo? Vuelve a viewer.')).toBeInTheDocument()
  })

  it('la propia cuenta y la de otro superadmin no tienen botones', async () => {
    renderAccounts()

    await screen.findByText('Otro Super')
    expect(within(row('Otro Super')).queryByRole('button')).not.toBeInTheDocument()
  })

  it('si no se puede cambiar el rol, lo explica', async () => {
    renderAccounts({
      makeAdmin: vi.fn().mockRejectedValue(new Error('No tienes permiso para hacer esto, o ya no existe.')),
    })

    await screen.findByText('Benito Ejemplo')
    await userEvent.click(within(row('Benito Ejemplo')).getByRole('button', { name: 'Hacer admin' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sí, hacer admin' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No tienes permiso para hacer esto')
  })

  it('si no se puede cargar, lo dice y deja reintentar', async () => {
    renderAccounts({
      listAccounts: vi
        .fn()
        .mockRejectedValueOnce(new Error('No se pudieron cargar los usuarios.'))
        .mockResolvedValue(ACCOUNTS),
    })

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar los usuarios.')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('Ana Ejemplo')).toBeInTheDocument()
  })
})
