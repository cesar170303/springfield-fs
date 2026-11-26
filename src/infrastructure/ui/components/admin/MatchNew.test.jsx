import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import MatchNew from './MatchNew'
import { UseCasesContext } from '../../use-cases-context'

const FILTERS = { seasons: [{ id: 2, name: '2026/27', isCurrent: true }], competitions: [], initialSeasonId: 2 }
const COMPETITIONS = [
  { id: 1, name: 'Liga', type: 'league' },
  { id: 2, name: 'Copa local', type: 'cup' },
]
const LIST = {
  competitions: COMPETITIONS,
  // El último partido fue a las 20:00: es la hora que se propone.
  matches: [
    { id: 6, competitionId: 1, round: 6, date: new Date(2026, 10, 22, 20, 0) },
    { id: 4, competitionId: 2, round: 1, date: new Date(2026, 10, 15, 18, 30) },
  ],
}

// «Ahora» es el jueves 26 nov a mediodía (hora local).
beforeEach(() => vi.useFakeTimers({ now: new Date(2026, 10, 26, 12, 0), toFake: ['Date'] }))
afterEach(() => vi.useRealTimers())

// El editor, adonde va el partido recién creado: enseña la URL y lo que se le anuncia.
function Editor() {
  const { pathname, search, state } = useLocation()
  return (
    <p>
      Editor en {pathname + search}: {state?.ok}
    </p>
  )
}

function renderNew(overrides = {}) {
  const useCases = {
    getSquadFilters: vi.fn().mockResolvedValue(FILTERS),
    listMatches: vi.fn().mockResolvedValue(LIST),
    saveMatch: vi.fn().mockResolvedValue(9),
    ...overrides,
  }
  render(
    <UseCasesContext.Provider value={useCases}>
      <MemoryRouter initialEntries={['/admin/partidos/nuevo?temporada=2']}>
        <Routes>
          <Route path="/admin/partidos/nuevo" element={<MatchNew />} />
          <Route path="/admin/partidos/:matchId" element={<Editor />} />
          <Route path="/admin/partidos" element={<p>Lista de partidos</p>} />
        </Routes>
      </MemoryRouter>
    </UseCasesContext.Provider>,
  )
  return useCases
}

describe('MatchNew', () => {
  it('propone la jornada siguiente de la competición elegida', async () => {
    renderNew()

    expect(await screen.findByLabelText('Jornada')).toHaveValue(7)
    await userEvent.selectOptions(screen.getByLabelText('Competición'), 'Copa local')
    expect(screen.getByLabelText('Jornada')).toHaveValue(2)
  })

  it('crea el partido en hora local y abre su editor, que lo anuncia', async () => {
    const useCases = renderNew()

    await userEvent.type(await screen.findByLabelText('Rival'), 'CD Ejemplo')
    await userEvent.type(screen.getByLabelText('Fecha'), '2026-11-29')
    expect(screen.getByLabelText('Hora')).toHaveValue('20:00')
    await userEvent.selectOptions(screen.getByLabelText('Hora'), '18:30')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(useCases.saveMatch).toHaveBeenCalledWith({
      seasonId: 2,
      competitionId: 1,
      round: '7',
      opponent: 'CD Ejemplo',
      date: new Date(2026, 10, 29, 18, 30),
      goalsFor: '',
      goalsAgainst: '',
    })
    expect(await screen.findByText('Editor en /admin/partidos/9?temporada=2: Partido creado.')).toBeInTheDocument()
  })

  it('«Hoy» y «Próximo sábado» ponen la fecha con un toque', async () => {
    renderNew()

    await userEvent.click(await screen.findByRole('button', { name: 'Próximo sábado' }))
    expect(screen.getByLabelText('Fecha')).toHaveValue('2026-11-28')
    await userEvent.click(screen.getByRole('button', { name: 'Hoy' }))
    expect(screen.getByLabelText('Fecha')).toHaveValue('2026-11-26')
  })

  it('sin partidos anteriores, propone las 18:30', async () => {
    renderNew({ listMatches: vi.fn().mockResolvedValue({ competitions: COMPETITIONS, matches: [] }) })

    expect(await screen.findByLabelText('Hora')).toHaveValue('18:30')
  })

  it('con fecha futura no deja poner resultado, y lo explica', async () => {
    renderNew()

    await userEvent.type(await screen.findByLabelText('Fecha'), '2026-11-22')
    await userEvent.type(screen.getByLabelText('Goles a favor'), '3')
    await userEvent.type(screen.getByLabelText('Goles en contra'), '1')
    await userEvent.click(screen.getByRole('button', { name: 'Próximo sábado' }))

    expect(screen.getByLabelText('Goles a favor')).toBeDisabled()
    expect(screen.getByLabelText('Goles a favor')).toHaveValue(null)
    expect(screen.getByLabelText('Goles en contra')).toBeDisabled()
    expect(screen.getByText('El resultado se pone cuando el partido ya se ha jugado.')).toBeInTheDocument()
  })

  it('una jornada repetida se explica y no se pierde lo escrito', async () => {
    renderNew({
      saveMatch: vi.fn().mockRejectedValue(new Error('Ya hay un partido de esa competición en esa jornada.')),
    })

    await userEvent.type(await screen.findByLabelText('Rival'), 'CD Ejemplo')
    await userEvent.type(screen.getByLabelText('Fecha'), '2026-11-29')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Ya hay un partido de esa competición en esa jornada.')
    expect(screen.getByLabelText('Rival')).toHaveValue('CD Ejemplo')
  })

  it('«Cancelar» vuelve a la lista', async () => {
    const useCases = renderNew()

    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar' }))

    expect(await screen.findByText('Lista de partidos')).toBeInTheDocument()
    expect(useCases.saveMatch).not.toHaveBeenCalled()
  })

  it('sin competiciones, explica que hay que crear una antes', async () => {
    renderNew({ listMatches: vi.fn().mockResolvedValue({ competitions: [], matches: [] }) })

    expect(
      await screen.findByText('Primero, crea una competición en «Temporadas y competiciones».'),
    ).toBeInTheDocument()
  })
})
