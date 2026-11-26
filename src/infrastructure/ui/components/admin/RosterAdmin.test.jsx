import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import RosterAdmin from './RosterAdmin'
import { UseCasesContext } from '../../use-cases-context'

const FILTERS = {
  seasons: [
    { id: 2, name: '2026/27', isCurrent: true },
    { id: 1, name: '2025/26', isCurrent: false },
  ],
  competitions: [],
  initialSeasonId: 2,
}
const player = (id, nickname, shirtNumber, position = 'winger') => ({
  id,
  nickname,
  firstName: `N${id}`,
  position,
  photoUrl: null,
  shirtNumber,
})
const SHEET = {
  roster: [player(2, 'Dani', 4, 'defender'), player(3, 'Checo', 7)],
  available: [player(4, 'Álvaro', undefined, 'goalkeeper')],
  copyFrom: null,
}

function renderRoster(overrides = {}, url = '/admin/plantilla?temporada=2') {
  const useCases = {
    getSquadFilters: vi.fn().mockResolvedValue(FILTERS),
    getRosterSheet: vi.fn().mockResolvedValue(SHEET),
    addToRoster: vi.fn().mockResolvedValue(),
    changeShirtNumber: vi.fn().mockResolvedValue(),
    removeFromRoster: vi.fn().mockResolvedValue(),
    copyRoster: vi.fn().mockResolvedValue(),
    ...overrides,
  }
  render(
    <UseCasesContext.Provider value={useCases}>
      <MemoryRouter initialEntries={[url]}>
        <RosterAdmin />
      </MemoryRouter>
    </UseCasesContext.Provider>,
  )
  return useCases
}

describe('RosterAdmin', () => {
  it('lista la plantilla de la temporada elegida, por dorsal y con su posición', async () => {
    const useCases = renderRoster()

    const rows = within(await screen.findByRole('list')).getAllByRole('listitem')
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringMatching(/^4.*Dani.*Cierre/),
      expect.stringMatching(/^7.*Checo.*Ala/),
    ])
    expect(useCases.getRosterSheet).toHaveBeenCalledWith(2)
    expect(screen.getByRole('heading', { name: 'Jugadores, 2' })).toBeInTheDocument()
  })

  it('al cambiar de temporada, carga su plantilla', async () => {
    const useCases = renderRoster()

    await userEvent.selectOptions(await screen.findByLabelText('Temporada'), '2025/26')

    expect(useCases.getRosterSheet).toHaveBeenLastCalledWith(1)
  })

  it('añade un jugador con su dorsal', async () => {
    const useCases = renderRoster()

    await userEvent.click(await screen.findByRole('button', { name: 'Añadir jugador' }))
    await userEvent.selectOptions(screen.getByLabelText('Jugador'), 'Álvaro')
    await userEvent.type(screen.getByLabelText('Dorsal'), '1')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(useCases.addToRoster).toHaveBeenCalledWith({ seasonId: 2, playerId: 4, shirtNumber: '1' })
    expect(await screen.findByRole('status')).toHaveTextContent('Jugador añadido.')
    expect(useCases.getRosterSheet).toHaveBeenCalledTimes(2)
  })

  it('un dorsal repetido se explica y no se pierde lo escrito', async () => {
    renderRoster({
      addToRoster: vi.fn().mockRejectedValue(new Error('Ese dorsal ya lo lleva otro jugador esta temporada.')),
    })

    await userEvent.click(await screen.findByRole('button', { name: 'Añadir jugador' }))
    await userEvent.type(screen.getByLabelText('Dorsal'), '7')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Ese dorsal ya lo lleva otro jugador esta temporada.')
    expect(screen.getByLabelText('Dorsal')).toHaveValue(7)
  })

  it('si todas las fichas activas ya están, lo dice al querer añadir', async () => {
    renderRoster({ getRosterSheet: vi.fn().mockResolvedValue({ ...SHEET, available: [] }) })

    await userEvent.click(await screen.findByRole('button', { name: 'Añadir jugador' }))

    expect(screen.getByText('Todas las fichas activas ya están en la plantilla.')).toBeInTheDocument()
  })

  it('cambia el dorsal de un jugador', async () => {
    const useCases = renderRoster()

    await userEvent.click(await screen.findByRole('button', { name: 'Editar Checo' }))
    expect(screen.getByLabelText('Dorsal')).toHaveValue(7)
    await userEvent.clear(screen.getByLabelText('Dorsal'))
    await userEvent.type(screen.getByLabelText('Dorsal'), '10')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(useCases.changeShirtNumber).toHaveBeenCalledWith({ seasonId: 2, playerId: 3, shirtNumber: '10' })
    expect(await screen.findByRole('status')).toHaveTextContent('Dorsal cambiado.')
  })

  it('quita a un jugador con confirmación', async () => {
    const useCases = renderRoster()

    await userEvent.click(await screen.findByRole('button', { name: 'Editar Checo' }))
    await userEvent.click(screen.getByRole('button', { name: 'Quitar' }))
    expect(screen.getByText('¿Quitar a Checo de la plantilla de 2026/27?')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sí, quitar' }))

    expect(useCases.removeFromRoster).toHaveBeenCalledWith({ seasonId: 2, playerId: 3 })
    expect(await screen.findByRole('status')).toHaveTextContent('Checo, fuera de la plantilla.')
  })

  it('quitar a un convocado lo impide la base de datos, y se explica', async () => {
    renderRoster({
      removeFromRoster: vi
        .fn()
        .mockRejectedValue(new Error('Checo ya fue convocado esta temporada: no se puede quitar de la plantilla.')),
    })

    await userEvent.click(await screen.findByRole('button', { name: 'Editar Checo' }))
    await userEvent.click(screen.getByRole('button', { name: 'Quitar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sí, quitar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Checo ya fue convocado esta temporada')
  })

  it('con la plantilla vacía, copia la de la temporada anterior', async () => {
    const useCases = renderRoster({
      getRosterSheet: vi
        .fn()
        .mockResolvedValue({ roster: [], available: SHEET.available, copyFrom: { seasonName: '2025/26', count: 8 } }),
    })

    await userEvent.click(await screen.findByRole('button', { name: 'Copiar la plantilla de 2025/26 (8 jugadores)' }))

    expect(useCases.copyRoster).toHaveBeenCalledWith(2)
    expect(await screen.findByRole('status')).toHaveTextContent('Plantilla copiada.')
  })

  it('con la plantilla vacía y nada que copiar, invita a añadir jugadores', async () => {
    renderRoster({ getRosterSheet: vi.fn().mockResolvedValue({ roster: [], available: [], copyFrom: null }) })

    expect(await screen.findByText('La plantilla de esta temporada está vacía. Añade jugadores.')).toBeInTheDocument()
  })

  it('si no se puede cargar, lo dice y deja reintentar', async () => {
    const useCases = renderRoster({
      getRosterSheet: vi
        .fn()
        .mockRejectedValueOnce(new Error('No se pudo cargar la plantilla.'))
        .mockResolvedValue(SHEET),
    })

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar la plantilla.')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('Checo')).toBeInTheDocument()
    expect(useCases.getRosterSheet).toHaveBeenCalledTimes(2)
  })
})

it('si se pulsa «Añadir jugador» antes de que cargue la plantilla, no dice que no hay fichas', async () => {
  const getRosterSheet = vi.fn(() => new Promise(() => {}))
  renderRoster({ getRosterSheet })

  await userEvent.click(await screen.findByRole('button', { name: 'Añadir jugador' }))

  expect(screen.queryByText('Todas las fichas activas ya están en la plantilla.')).not.toBeInTheDocument()
})
