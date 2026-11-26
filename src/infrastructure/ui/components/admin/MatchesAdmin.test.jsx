import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import MatchesAdmin from './MatchesAdmin'
import { UseCasesContext } from '../../use-cases-context'

const FILTERS = {
  seasons: [
    { id: 2, name: '2026/27', isCurrent: true },
    { id: 1, name: '2025/26', isCurrent: false },
  ],
  competitions: [],
  initialSeasonId: 2,
}
const match = (id, label, date, extra = {}) => ({
  id,
  label,
  date,
  opponent: `Rival ${id}`,
  goalsFor: null,
  goalsAgainst: null,
  isFinished: false,
  ...extra,
})
// Fechas en hora local; «ahora» es el 26 nov a mediodía.
const LIST = {
  competitions: [],
  matches: [
    match(7, 'J7', new Date(2026, 10, 29, 18, 30)),
    match(6, 'J6', new Date(2026, 10, 22, 18, 30), { goalsFor: 4, goalsAgainst: 2 }),
    match(5, 'J5', new Date(2026, 10, 20, 18, 30), { goalsFor: 3, goalsAgainst: 2, isFinished: true }),
    match(4, 'Copa J1', new Date(2026, 10, 8, 18, 30), { goalsFor: 1, goalsAgainst: 4, isFinished: true }),
  ],
}

beforeEach(() => vi.useFakeTimers({ now: new Date(2026, 10, 26, 12, 0), toFake: ['Date'] }))
afterEach(() => vi.useRealTimers())

function renderList(overrides = {}) {
  const useCases = {
    getSquadFilters: vi.fn().mockResolvedValue(FILTERS),
    listMatches: vi.fn().mockResolvedValue(LIST),
    ...overrides,
  }
  render(
    <UseCasesContext.Provider value={useCases}>
      <MemoryRouter initialEntries={['/admin/partidos?temporada=2']}>
        <MatchesAdmin />
      </MemoryRouter>
    </UseCasesContext.Provider>,
  )
  return useCases
}

describe('MatchesAdmin', () => {
  it('lista los partidos con etiqueta, fecha, rival, estado y resultado', async () => {
    const useCases = renderList()

    const rows = within(await screen.findByRole('list')).getAllByRole('link')
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringMatching(/J7.*29 nov.*Rival 7.*Por jugar.*–/),
      expect.stringMatching(/J6.*22 nov.*Rival 6.*Por terminar.*4–2/),
      expect.stringMatching(/J5.*20 nov.*Rival 5.*Votación abierta hasta el 27 nov.*3–2/),
      expect.stringMatching(/Copa J1.*8 nov.*Rival 4.*Votación cerrada.*1–4/),
    ])
    expect(rows[1]).toHaveAttribute('href', '/admin/partidos/6?temporada=2')
    expect(useCases.listMatches).toHaveBeenCalledWith(2)
  })

  it('enlaza al partido nuevo con la temporada elegida', async () => {
    renderList()

    expect(await screen.findByRole('link', { name: 'Nuevo partido' })).toHaveAttribute(
      'href',
      '/admin/partidos/nuevo?temporada=2',
    )
  })

  it('al cambiar de temporada, carga sus partidos', async () => {
    const useCases = renderList()

    await userEvent.selectOptions(await screen.findByLabelText('Temporada'), '2025/26')

    expect(useCases.listMatches).toHaveBeenLastCalledWith(1)
  })

  it('sin partidos, invita a crear el primero', async () => {
    renderList({ listMatches: vi.fn().mockResolvedValue({ competitions: [], matches: [] }) })

    expect(await screen.findByText('Aún no hay partidos en esta temporada. Crea el primero.')).toBeInTheDocument()
  })

  it('si no se pueden cargar, lo dice y deja reintentar', async () => {
    renderList({
      listMatches: vi
        .fn()
        .mockRejectedValueOnce(new Error('No se pudieron cargar los partidos.'))
        .mockResolvedValue(LIST),
    })

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar los partidos.')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('Rival 7')).toBeInTheDocument()
  })
})
