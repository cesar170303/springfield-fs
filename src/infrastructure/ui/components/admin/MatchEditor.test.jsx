import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import MatchEditor from './MatchEditor'
import { UseCasesContext } from '../../use-cases-context'

const FILTERS = { seasons: [{ id: 2, name: '2026/27', isCurrent: true }], competitions: [], initialSeasonId: 2 }
const COMPETITIONS = [
  { id: 1, name: 'Liga', type: 'league' },
  { id: 2, name: 'Copa local', type: 'cup' },
]
const J6 = {
  id: 6,
  competitionId: 1,
  competition: COMPETITIONS[0],
  label: 'J6',
  round: 6,
  date: new Date(2026, 10, 22, 18, 30),
  opponent: 'CD Mejorada',
  goalsFor: 4,
  goalsAgainst: 2,
  isFinished: false,
}
const J5 = { ...J6, id: 5, label: 'J5', round: 5, opponent: 'Inter Arganda', isFinished: true }

// «Ahora» es el 26 nov a mediodía (hora local).
beforeEach(() => vi.useFakeTimers({ now: new Date(2026, 10, 26, 12, 0), toFake: ['Date'] }))
afterEach(() => vi.useRealTimers())

function List() {
  const { pathname, state } = useLocation()
  return (
    <p>
      Lista en {pathname}: {state?.ok}
    </p>
  )
}

function renderEditor(entry = '/admin/partidos/6?temporada=2', overrides = {}) {
  const useCases = {
    getSquadFilters: vi.fn().mockResolvedValue(FILTERS),
    listMatches: vi.fn().mockResolvedValue({ competitions: COMPETITIONS, matches: [J6, J5] }),
    saveMatch: vi.fn().mockResolvedValue(6),
    deleteMatch: vi.fn().mockResolvedValue(),
    ...overrides,
  }
  render(
    <UseCasesContext.Provider value={useCases}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/admin/partidos/:matchId" element={<MatchEditor />} />
          <Route path="/admin/partidos" element={<List />} />
        </Routes>
      </MemoryRouter>
    </UseCasesContext.Provider>,
  )
  return useCases
}

describe('MatchEditor', () => {
  it('enseña el partido: etiqueta, fecha, estado, rival y resultado', async () => {
    renderEditor()

    expect(await screen.findByRole('heading', { name: 'CD Mejorada' })).toBeInTheDocument()
    expect(screen.getByText('J6, 22 nov 18:30 · Por terminar')).toBeInTheDocument()
    expect(screen.getByText('4–2')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a partidos' })).toHaveAttribute(
      'href',
      '/admin/partidos?temporada=2',
    )
  })

  it('sin resultado, no enseña marcador (una raya junto al rival parecería parte del nombre)', async () => {
    renderEditor(undefined, {
      listMatches: vi.fn().mockResolvedValue({
        competitions: COMPETITIONS,
        matches: [{ ...J6, goalsFor: null, goalsAgainst: null }],
      }),
    })

    expect(await screen.findByRole('heading', { name: 'CD Mejorada' })).toBeInTheDocument()
    expect(screen.queryByText('–')).not.toBeInTheDocument()
  })

  it('«Datos del partido» trae sus valores y guarda los cambios', async () => {
    const useCases = renderEditor()

    expect(await screen.findByLabelText('Fecha')).toHaveValue('2026-11-22')
    expect(screen.getByLabelText('Hora')).toHaveValue('18:30')
    expect(screen.getByLabelText('Goles a favor')).toHaveValue(4)
    await userEvent.clear(screen.getByLabelText('Goles en contra'))
    await userEvent.type(screen.getByLabelText('Goles en contra'), '3')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(useCases.saveMatch).toHaveBeenCalledWith(
      expect.objectContaining({ id: 6, seasonId: 2, goalsFor: '4', goalsAgainst: '3', round: '6' }),
    )
    expect(await screen.findByRole('status')).toHaveTextContent('Datos guardados.')
    expect(useCases.listMatches).toHaveBeenCalledTimes(2)
  })

  it('lo que rechace la base de datos se explica con su frase', async () => {
    renderEditor(undefined, {
      saveMatch: vi
        .fn()
        .mockRejectedValue(new Error('La votación de este partido ya se cerró: esa fecha la volvería a abrir.')),
    })

    await userEvent.click(await screen.findByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('esa fecha la volvería a abrir')
  })

  it('un partido sin terminar se borra con confirmación y vuelve a la lista', async () => {
    const useCases = renderEditor()

    await userEvent.click(await screen.findByRole('button', { name: 'Borrar partido' }))
    expect(
      screen.getByText('¿Borrar el partido J6 contra CD Mejorada? Se borran también su convocatoria y sus goles.'),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sí, borrar' }))

    expect(useCases.deleteMatch).toHaveBeenCalledWith(6)
    expect(await screen.findByText('Lista en /admin/partidos: Partido borrado.')).toBeInTheDocument()
  })

  it('un partido terminado no tiene «Borrar partido»', async () => {
    renderEditor('/admin/partidos/5?temporada=2')

    expect(await screen.findByRole('heading', { name: 'Inter Arganda' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Borrar partido' })).not.toBeInTheDocument()
  })

  it('anuncia lo que llega de la pantalla anterior (partido recién creado)', async () => {
    renderEditor({ pathname: '/admin/partidos/6', search: '?temporada=2', state: { ok: 'Partido creado.' } })

    expect(await screen.findByRole('status')).toHaveTextContent('Partido creado.')
  })

  it('un partido que no está en la temporada lo dice', async () => {
    renderEditor('/admin/partidos/99?temporada=2')

    expect(await screen.findByText('Este partido no existe en esta temporada.')).toBeInTheDocument()
  })

  it('si no se puede cargar, lo dice y deja reintentar', async () => {
    renderEditor(undefined, {
      listMatches: vi
        .fn()
        .mockRejectedValueOnce(new Error('No se pudieron cargar los partidos.'))
        .mockResolvedValue({ competitions: COMPETITIONS, matches: [J6] }),
    })

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar los partidos.')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('heading', { name: 'CD Mejorada' })).toBeInTheDocument()
  })
})
