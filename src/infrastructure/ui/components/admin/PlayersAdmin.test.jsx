import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import PlayersAdmin from './PlayersAdmin'
import { UseCasesContext } from '../../use-cases-context'

const player = (id, nickname, extra = {}) => ({
  id,
  firstName: `Nombre${id}`,
  lastName: 'Ejemplo',
  nickname,
  email: null,
  position: 'winger',
  status: 'available',
  photoUrl: null,
  hasAccount: false,
  archived: false,
  ...extra,
})
const PLAYERS = [
  player(1, 'Checo', { email: 'sergio@example.com', status: 'injured' }),
  player(2, 'Dani', { position: 'defender', email: 'daniel@example.com', hasAccount: true }),
  player(3, 'Navi', { archived: true }),
]

function renderList(listPlayers = vi.fn().mockResolvedValue(PLAYERS), entry = '/admin/jugadores?temporada=2') {
  render(
    <UseCasesContext.Provider value={{ listPlayers }}>
      <MemoryRouter initialEntries={[entry]}>
        <PlayersAdmin />
      </MemoryRouter>
    </UseCasesContext.Provider>,
  )
  return listPlayers
}

describe('PlayersAdmin', () => {
  it('lista las fichas activas con posición, correo, estado y si tienen cuenta', async () => {
    renderList()

    const checo = (await screen.findByText('Checo')).closest('a')
    expect(checo).toHaveTextContent(/Ala.*sergio@example\.com.*Lesionado.*Sin cuenta/)
    expect(checo).toHaveAttribute('href', '/admin/jugadores/1?temporada=2')
    expect(screen.getByText('Dani').closest('a')).toHaveTextContent(/Cierre.*Disponible.*Con cuenta/)
    expect(screen.queryByText('Navi')).not.toBeInTheDocument()
  })

  it('sin correo, lo dice', async () => {
    renderList(vi.fn().mockResolvedValue([player(4, 'Javi')]))

    expect((await screen.findByText('Javi')).closest('a')).toHaveTextContent('Sin correo')
  })

  it('las archivadas salen aparte', async () => {
    renderList()

    const archived = await screen.findByRole('button', { name: 'Archivados, 1' })
    expect(screen.getByRole('button', { name: 'Activos, 2' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(archived)

    expect(archived).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Navi')).toBeInTheDocument()
    expect(screen.queryByText('Checo')).not.toBeInTheDocument()
  })

  it('enlaza a la ficha nueva y vuelve al panel con la temporada elegida', async () => {
    renderList()

    expect(await screen.findByRole('link', { name: 'Nueva ficha' })).toHaveAttribute(
      'href',
      '/admin/jugadores/nuevo?temporada=2',
    )
    expect(screen.getByRole('link', { name: 'Volver al panel' })).toHaveAttribute('href', '/admin?temporada=2')
  })

  it('anuncia lo que se acaba de hacer en la ficha', async () => {
    renderList(undefined, { pathname: '/admin/jugadores', state: { ok: 'Ficha guardada.' } })

    expect(await screen.findByRole('status')).toHaveTextContent('Ficha guardada.')
  })

  it('sin fichas, invita a crear la primera; sin archivadas, lo dice', async () => {
    renderList(vi.fn().mockResolvedValue([]))

    expect(await screen.findByText('Aún no hay ninguna ficha. Crea la primera.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Archivados, 0' }))
    expect(screen.getByText('No hay fichas archivadas.')).toBeInTheDocument()
  })

  it('si no se pueden cargar, lo dice y deja reintentar', async () => {
    const listPlayers = renderList(
      vi.fn().mockRejectedValueOnce(new Error('No se pudieron cargar.')).mockResolvedValue(PLAYERS),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar.')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('Checo')).toBeInTheDocument()
    expect(listPlayers).toHaveBeenCalledTimes(2)
  })
})
