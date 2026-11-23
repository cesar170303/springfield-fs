import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { gsap } from 'gsap'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import SquadScreen from './SquadScreen'
import { UseCasesContext } from '../use-cases-context'

const player = (id, name, shirtNumber, position, stats = {}) => ({
  id,
  name,
  shirtNumber,
  position,
  photoUrl: null,
  matchesPlayed: 10,
  goals: 0,
  assists: 0,
  yellowCards: 0,
  redCards: 0,
  avgRating: null,
  mvps: 0,
  goalsConceded: 0,
  ...stats,
})

const SQUAD = [
  player(1, 'Tano', 1, 'goalkeeper', { goalsConceded: 18, avgRating: 7.4 }),
  player(2, 'Rulo', 4, 'defender', { goals: 4, assists: 3, redCards: 1, yellowCards: 2, avgRating: 7.9 }),
  player(3, 'Chino', 10, 'winger', { goals: 11, assists: 4, avgRating: 8.27, mvps: 5 }),
  player(4, 'Pitu', 7, 'winger', { goals: 3, assists: 5 }),
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

// Enseña la URL a la que se ha navegado, para comprobar enlaces sin un navegador real.
function WhereAmI() {
  const { pathname, search } = useLocation()
  return <p>Estás en {pathname + search}</p>
}

function renderScreen(overrides = {}, url = '/') {
  const useCases = {
    getSquadFilters: vi.fn().mockResolvedValue(FILTERS),
    getSquadStats: vi.fn().mockResolvedValue(SQUAD),
    ...overrides,
  }
  render(
    <UseCasesContext.Provider value={useCases}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/" element={<SquadScreen />} />
          <Route path="/jugador/:playerId" element={<WhereAmI />} />
        </Routes>
      </MemoryRouter>
    </UseCasesContext.Provider>,
  )
  return useCases
}

// Nombres de las filas de la lista, en el orden en que se ven.
const listedNames = () =>
  within(screen.getByRole('table'))
    .getAllByRole('rowheader')
    .map((cell) => cell.textContent)

afterEach(() => vi.unstubAllGlobals())

describe('SquadScreen', () => {
  it('al entrar pide la temporada actual en todas las competiciones y enseña los líderes', async () => {
    const useCases = renderScreen()

    const scorers = await screen.findByRole('region', { name: 'Goleadores' })
    expect(
      within(scorers)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Chino11', 'Rulo4', 'Pitu3'])
    expect(useCases.getSquadStats).toHaveBeenCalledWith({ seasonId: 2, competitionId: null })
  })

  it('enseña las seis tarjetas, la valoración con un decimal y las tarjetas con su número', async () => {
    renderScreen()

    await screen.findByRole('region', { name: 'Goleadores' })
    expect(screen.getAllByRole('region').map((r) => r.getAttribute('aria-label'))).toEqual([
      'Goleadores',
      'Asistencias',
      'Goles + asistencias',
      'Valoración media',
      'MVPs',
      'Tarjetas',
    ])
    expect(within(screen.getByRole('region', { name: 'Valoración media' })).getByText('8,3')).toBeInTheDocument()
    expect(
      within(screen.getByRole('region', { name: 'Tarjetas' })).getByLabelText('2 amarillas y 1 roja'),
    ).toBeInTheDocument()
  })

  it('cambia a la lista, agrupada por posición y por dorsal, y vuelve a las tarjetas', async () => {
    renderScreen()
    await screen.findByRole('region', { name: 'Goleadores' })

    await userEvent.click(screen.getByRole('button', { name: 'Mostrar como lista' }))

    expect(screen.getByRole('columnheader', { name: 'Portero' })).toBeInTheDocument()
    expect(listedNames()).toEqual(['Tano', 'Rulo', 'Pitu', 'Chino'])
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar como tarjetas' }))
    expect(screen.getByRole('region', { name: 'Goleadores' })).toBeInTheDocument()
  })

  it('al ordenar por una estadística, la lista es única y de mayor a menor', async () => {
    renderScreen()
    await userEvent.click(await screen.findByRole('button', { name: 'Mostrar como lista' }))

    await userEvent.selectOptions(screen.getByLabelText('Ordenar por'), 'Asistencias')

    expect(screen.queryByRole('columnheader', { name: 'Portero' })).not.toBeInTheDocument()
    expect(listedNames()).toEqual(['Pitu', 'Chino', 'Rulo', 'Tano'])
  })

  it('al portero le enseña los goles encajados en la columna de goles', async () => {
    renderScreen()
    await userEvent.click(await screen.findByRole('button', { name: 'Mostrar como lista' }))

    const tano = screen.getByRole('rowheader', { name: 'Tano' }).closest('tr')
    expect(within(tano).getByText('18')).toBeInTheDocument()
  })

  it('al cambiar de competición o de temporada, vuelve a pedir las estadísticas', async () => {
    const useCases = renderScreen()
    await screen.findByRole('region', { name: 'Goleadores' })

    await userEvent.selectOptions(screen.getByLabelText('Competición'), 'Liga')
    await userEvent.selectOptions(screen.getByLabelText('Temporada'), '2025/26')

    expect(useCases.getSquadStats).toHaveBeenCalledWith({ seasonId: 2, competitionId: 1 })
    expect(useCases.getSquadStats).toHaveBeenLastCalledWith({ seasonId: 1, competitionId: 1 })
  })

  it('si no se puede cargar, lo dice', async () => {
    renderScreen({ getSquadStats: vi.fn().mockRejectedValue(new Error('No se pudo cargar la plantilla: x')) })

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar la plantilla. Inténtalo de nuevo.')
  })

  it('sin estadísticas todavía, lo explica en vez de enseñar tarjetas vacías', async () => {
    renderScreen({ getSquadStats: vi.fn().mockResolvedValue([]) })

    expect(await screen.findByText('Todavía no hay estadísticas en esta temporada.')).toBeInTheDocument()
  })

  it('sin temporadas creadas, lo explica', async () => {
    const useCases = renderScreen({
      getSquadFilters: vi.fn().mockResolvedValue({ ...FILTERS, seasons: [], initialSeasonId: null }),
    })

    expect(await screen.findByText('Aún no hay ninguna temporada.')).toBeInTheDocument()
    expect(useCases.getSquadStats).not.toHaveBeenCalled()
  })

  it('las cifras de las tarjetas ruedan hasta su valor', async () => {
    const motion = (reduce) =>
      vi.stubGlobal('matchMedia', (query) => ({
        matches: query.includes('no-preference') ? !reduce : reduce,
        media: query,
        addEventListener() {},
        removeEventListener() {},
      }))
    const countOf = async () => within(await screen.findByRole('region', { name: 'Goleadores' })).getByText('11')

    motion(false)
    renderScreen()
    expect(gsap.getTweensOf(await countOf())).not.toHaveLength(0)
  })

  it('con «reducir movimiento», las cifras aparecen ya con su valor', async () => {
    vi.stubGlobal('matchMedia', (query) => ({
      matches: !query.includes('no-preference'),
      media: query,
      addEventListener() {},
      removeEventListener() {},
    }))
    renderScreen()

    const count = within(await screen.findByRole('region', { name: 'Goleadores' })).getByText('11')
    expect(gsap.getTweensOf(count)).toHaveLength(0)
  })

  it('al pulsar un jugador abre su ficha con la temporada y la competición elegidas', async () => {
    renderScreen()

    await userEvent.selectOptions(await screen.findByLabelText('Competición'), 'Copa')
    const scorers = await screen.findByRole('region', { name: 'Goleadores' })
    await userEvent.click(within(scorers).getByRole('link', { name: 'Chino' }))

    expect(screen.getByText('Estás en /jugador/3?temporada=2&competicion=2')).toBeInTheDocument()
  })

  it('en la lista, el apodo también lleva a la ficha', async () => {
    renderScreen()

    await userEvent.click(await screen.findByRole('button', { name: 'Mostrar como lista' }))
    await userEvent.click(within(screen.getByRole('table')).getByRole('link', { name: 'Rulo' }))

    expect(screen.getByText('Estás en /jugador/2?temporada=2')).toBeInTheDocument()
  })

  it('si la temporada y la competición de la URL ya no existen, abre por la inicial y con todas', async () => {
    const useCases = renderScreen({}, '/?temporada=99&competicion=99')

    await waitFor(() => expect(useCases.getSquadStats).toHaveBeenLastCalledWith({ seasonId: 2, competitionId: null }))
  })

  it('si solo ha desaparecido la competición, conserva la temporada elegida', async () => {
    const useCases = renderScreen({}, '/?temporada=1&competicion=99')

    await waitFor(() => expect(useCases.getSquadStats).toHaveBeenLastCalledWith({ seasonId: 1, competitionId: null }))
  })

  it('lee la temporada y la competición de la URL (al volver de una ficha se mantienen)', async () => {
    const useCases = renderScreen({}, '/?temporada=1&competicion=2')

    await screen.findByRole('region', { name: 'Goleadores' })
    expect(useCases.getSquadStats).toHaveBeenCalledWith({ seasonId: 1, competitionId: 2 })
    expect(useCases.getSquadStats).not.toHaveBeenCalledWith({ seasonId: 2, competitionId: null })
    expect(screen.getByLabelText('Temporada')).toHaveValue('1')
  })
})
