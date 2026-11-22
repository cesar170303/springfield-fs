import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { gsap } from 'gsap'
import { MemoryRouter, Route, Routes } from 'react-router'
import PlayerScreen from './PlayerScreen'
import { UseCasesContext } from '../use-cases-context'

const days = (n) => new Date(Date.now() + n * 86_400_000)

const chino = {
  id: 3,
  name: 'Chino',
  fullName: 'Luis Pérez',
  shirtNumber: 10,
  position: 'winger',
  status: 'available',
  photoUrl: null,
  matchesCalled: 11,
  matchesPlayed: 10,
  minutes: 312,
  goals: 11,
  assists: 4,
  penaltyGoals: 3,
  yellowCards: 2,
  redCards: 0,
  avgRating: 7.83,
  ratedMatches: 9,
  mvps: 3,
  goalsConceded: 0,
  cleanSheets: 0,
}

const timeline = [
  { matchId: 1, label: 'J1', opponent: 'C.D. Mirador', rating: 7, cumulativeAvg: 7, teamAvg: 6.8 },
  { matchId: 2, label: 'Copa J1', opponent: 'Racing Soto', rating: 8.5, cumulativeAvg: 7.75, teamAvg: 7.2 },
]

const match = (matchId, label, opponent, extra = {}) => ({
  matchId,
  date: days(-matchId),
  label,
  opponent,
  minutes: 30,
  goals: 0,
  assists: 0,
  goalsConceded: null,
  rating: 7,
  isMvp: false,
  votingClosesAt: days(-1),
  ...extra,
})

const matches = [
  match(9, 'J9', 'Los Rayos', { minutes: 36, goals: 1, rating: null, votingClosesAt: days(3) }),
  match(2, 'Copa J1', 'Racing Soto', { minutes: 40, goals: 2, rating: 8.5, isMvp: true }),
  match(1, 'J1', 'C.D. Mirador', { minutes: 32, assists: 1 }),
]

const FILTERS = {
  seasons: [
    { id: 2, name: '2026/27', isCurrent: true },
    { id: 1, name: '2025/26', isCurrent: false },
  ],
  competitions: [
    { id: 1, name: 'Liga' },
    { id: 2, name: 'Copa' },
  ],
  initialSeasonId: 2,
}

function renderSheet({
  url = '/jugador/3?temporada=2',
  sheet = { player: chino, timeline, matches },
  ...overrides
} = {}) {
  const useCases = {
    getSquadFilters: vi.fn().mockResolvedValue(FILTERS),
    getPlayerSheet: vi.fn().mockResolvedValue(sheet),
    ...overrides,
  }
  render(
    <UseCasesContext.Provider value={useCases}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/jugador/:playerId" element={<PlayerScreen />} />
        </Routes>
      </MemoryRouter>
    </UseCasesContext.Provider>,
  )
  return useCases
}

const title = () => screen.findByRole('heading', { level: 1, name: 'Chino' })

// Simula la preferencia del dispositivo: con `reduce`, pide reducir movimiento.
const motion = (reduce) =>
  vi.stubGlobal('matchMedia', (query) => ({
    matches: query.includes('no-preference') ? !reduce : reduce,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }))

afterEach(() => vi.unstubAllGlobals())

describe('PlayerScreen', () => {
  it('pide la ficha del jugador con la temporada y la competición de la URL', async () => {
    const useCases = renderSheet({ url: '/jugador/3?temporada=1&competicion=2' })

    await title()
    expect(useCases.getPlayerSheet).toHaveBeenCalledWith({ playerId: 3, seasonId: 1, competitionId: 2 })
  })

  it('sin temporada en la URL, usa la inicial', async () => {
    const useCases = renderSheet({ url: '/jugador/3' })

    await title()
    expect(useCases.getPlayerSheet).toHaveBeenCalledWith({ playerId: 3, seasonId: 2, competitionId: null })
  })

  it('enseña quién es: apodo, nombre real y dorsal, posición y estado', async () => {
    renderSheet()

    expect(await title()).toBeInTheDocument()
    expect(screen.getByText('Luis Pérez · dorsal 10')).toBeInTheDocument()
    expect(screen.getByText('Ala')).toBeInTheDocument()
    expect(screen.getByText('Disponible')).toBeInTheDocument()
  })

  it('la valoración media en el medidor, con un decimal, y cuántos partidos la forman', async () => {
    renderSheet()

    const gauge = await screen.findByRole('region', { name: 'Valoración media' })
    expect(within(gauge).getByRole('img', { name: 'Valoración media 7,8 sobre 10' })).toBeInTheDocument()
    expect(within(gauge).getByText('7,8')).toBeInTheDocument()
    expect(within(gauge).getByText('9 partidos valorados')).toBeInTheDocument()
  })

  it('sin votaciones cerradas, el medidor no inventa una nota', async () => {
    renderSheet({ sheet: { player: { ...chino, avgRating: null, ratedMatches: 0 }, timeline: [], matches } })

    const gauge = await screen.findByRole('region', { name: 'Valoración media' })
    expect(within(gauge).getByText('–')).toBeInTheDocument()
    expect(within(gauge).getByText('Aún sin partidos valorados')).toBeInTheDocument()
  })

  it('las seis cifras de la temporada, cada una con su detalle', async () => {
    renderSheet()

    const stats = await screen.findByRole('region', { name: 'Estadísticas de la temporada' })
    expect(within(stats).getByText('312')).toBeInTheDocument()
    expect(within(stats).getByText('31 por partido')).toBeInTheDocument()
    expect(within(stats).getByText('3 de penalti')).toBeInTheDocument()
    expect(within(stats).getByLabelText('2 amarillas y 0 rojas')).toBeInTheDocument()
  })

  it('al portero le enseña goles encajados y porterías a cero', async () => {
    const keeper = { ...chino, position: 'goalkeeper', goalsConceded: 18, cleanSheets: 2 }
    renderSheet({ sheet: { player: keeper, timeline, matches } })

    const stats = await screen.findByRole('region', { name: 'Estadísticas de la temporada' })
    expect(within(stats).getByText('Goles encajados')).toBeInTheDocument()
    expect(within(stats).getByText('Porterías a cero')).toBeInTheDocument()
    expect(within(stats).queryByText('Asistencias')).not.toBeInTheDocument()
  })

  it('la gráfica tiene un nombre que la describe y una tabla para quien no pueda verla', async () => {
    renderSheet()

    const chart = await screen.findByRole('region', { name: 'Partido a partido' })
    expect(within(chart).getByRole('img', { name: /Gráfica de la valoración/ })).toBeInTheDocument()
    await userEvent.click(within(chart).getByRole('button', { name: 'Ver como tabla' }))

    const rows = within(within(chart).getByRole('table')).getAllByRole('row')
    expect(rows).toHaveLength(3) // cabecera y dos partidos
    for (const text of ['Copa J1', 'Racing Soto', '8,5', '7,8', '7,2']) expect(rows[2]).toHaveTextContent(text)
  })

  it('al pasar por la gráfica enseña los datos del partido más cercano', async () => {
    renderSheet()

    const chart = await screen.findByRole('region', { name: 'Partido a partido' })
    fireEvent.pointerMove(within(chart).getByTestId('chart-area'), { clientX: 9999 })

    const tip = within(chart).getByRole('tooltip')
    expect(tip).toHaveTextContent('Copa J1 · vs. Racing Soto')
    expect(tip).toHaveTextContent(/Nota\s*8,5/)
    expect(tip).toHaveTextContent(/Equipo\s*7,2/)
  })

  it('sin partidos con la votación cerrada, la gráfica lo explica', async () => {
    renderSheet({ sheet: { player: chino, timeline: [], matches } })

    const chart = await screen.findByRole('region', { name: 'Partido a partido' })
    expect(within(chart).getByText('Todavía no hay partidos con la votación cerrada.')).toBeInTheDocument()
    expect(within(chart).queryByRole('img')).not.toBeInTheDocument()
  })

  it('últimos partidos: rival, minutos y goles, y la nota o hasta cuándo se vota', async () => {
    renderSheet()

    const log = await screen.findByRole('region', { name: 'Últimos partidos' })
    const [open, closed] = within(log).getAllByRole('listitem')
    expect(open).toHaveTextContent('J9')
    expect(open).toHaveTextContent('vs. Los Rayos')
    expect(open).toHaveTextContent("36' · 1 gol")
    expect(open).toHaveTextContent(/Votación abierta hasta el \d+ \w+/)
    expect(closed).toHaveTextContent("40' · 2 goles · MVP")
    expect(closed).toHaveTextContent('8,5')
  })

  it('enseña los 4 últimos partidos y el resto con «Ver todos los partidos»', async () => {
    const many = Array.from({ length: 6 }, (_, i) => match(i + 1, `J${i + 1}`, `Rival ${i + 1}`))
    renderSheet({ sheet: { player: chino, timeline, matches: many } })

    const log = await screen.findByRole('region', { name: 'Últimos partidos' })
    expect(within(log).getAllByRole('listitem')).toHaveLength(4)
    await userEvent.click(within(log).getByRole('button', { name: 'Ver todos los partidos' }))
    expect(within(log).getAllByRole('listitem')).toHaveLength(6)
  })

  it('cambiar de competición vuelve a pedir la ficha, y el enlace de vuelta conserva los filtros', async () => {
    const useCases = renderSheet()

    await userEvent.selectOptions(await screen.findByLabelText('Competición'), 'Copa')

    expect(useCases.getPlayerSheet).toHaveBeenLastCalledWith({ playerId: 3, seasonId: 2, competitionId: 2 })
    expect(screen.getByRole('link', { name: 'Volver a la plantilla' })).toHaveAttribute(
      'href',
      '/?temporada=2&competicion=2',
    )
  })

  it('si el jugador no está en la plantilla de esa temporada, lo dice', async () => {
    renderSheet({ sheet: { player: null, timeline: [], matches: [] } })

    expect(await screen.findByText('No hay ficha de este jugador en esta temporada.')).toBeInTheDocument()
  })

  it('con una dirección que no es de un jugador, no pide nada y lo dice', async () => {
    const useCases = renderSheet({ url: '/jugador/abc?temporada=2' })

    expect(await screen.findByText('No hay ficha de este jugador en esta temporada.')).toBeInTheDocument()
    expect(useCases.getPlayerSheet).not.toHaveBeenCalled()
  })

  it('con movimiento, el apodo entra letra a letra y las cifras ruedan al aparecer', async () => {
    motion(false)
    renderSheet()

    const name = await title()
    expect(name.children.length).toBe('Chino'.length)
    await waitFor(() => expect(gsap.getTweensOf(document.querySelector('[data-count="312"]'))).not.toHaveLength(0))
  })

  it('con «reducir movimiento», todo aparece quieto y con su valor', async () => {
    motion(true)
    renderSheet()

    const name = await title()
    expect(name.children).toHaveLength(0)
    expect(screen.getByText('312')).toBeInTheDocument()
    expect(gsap.getTweensOf(screen.getByText('312'))).toHaveLength(0)
  })

  it('si no se puede cargar, lo dice', async () => {
    renderSheet({ getPlayerSheet: vi.fn().mockRejectedValue(new Error('x')) })

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar la ficha. Inténtalo de nuevo.')
  })
})
