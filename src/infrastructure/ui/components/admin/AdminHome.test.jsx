import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, useLocation } from 'react-router'
import AdminHome from './AdminHome'
import { UseCasesContext } from '../../use-cases-context'

const FILTERS = {
  seasons: [
    { id: 2, name: '2026/27', isCurrent: true },
    { id: 1, name: '2025/26', isCurrent: false },
  ],
  competitions: [{ id: 1, name: 'Liga' }],
  initialSeasonId: 2,
}

function WhereAmI() {
  const { pathname, search } = useLocation()
  return <p>Estás en {pathname + search}</p>
}

function renderHome(getSquadFilters, url = '/admin', listMatches = vi.fn().mockResolvedValue({ matches: [] })) {
  render(
    <UseCasesContext.Provider value={{ getSquadFilters, listMatches }}>
      <MemoryRouter initialEntries={[url]}>
        <AdminHome />
        <Link to="/admin">Admin</Link>
        <WhereAmI />
      </MemoryRouter>
    </UseCasesContext.Provider>,
  )
}

describe('AdminHome', () => {
  it('abre con la temporada actual, guardada en la URL, y sin filtro de competición', async () => {
    renderHome(vi.fn().mockResolvedValue(FILTERS))

    expect(await screen.findByLabelText('Temporada')).toHaveValue('2')
    expect(await screen.findByText('Estás en /admin?temporada=2')).toBeInTheDocument()
    expect(screen.queryByLabelText('Competición')).not.toBeInTheDocument()
  })

  it('si la temporada de la URL ya no existe (se ha borrado), abre por la inicial', async () => {
    renderHome(vi.fn().mockResolvedValue(FILTERS), '/admin?temporada=99')

    expect(await screen.findByText('Estás en /admin?temporada=2')).toBeInTheDocument()
  })

  it('al pulsar «Admin» estando en el panel, conserva la temporada elegida', async () => {
    renderHome(vi.fn().mockResolvedValue(FILTERS), '/admin?temporada=1')
    await screen.findByLabelText('Temporada')

    await userEvent.click(screen.getByRole('link', { name: 'Admin' }))

    expect(await screen.findByText('Estás en /admin?temporada=1')).toBeInTheDocument()
  })

  it('al cambiar de temporada, cambia la URL', async () => {
    renderHome(vi.fn().mockResolvedValue(FILTERS))

    await userEvent.selectOptions(await screen.findByLabelText('Temporada'), '2025/26')

    expect(await screen.findByText('Estás en /admin?temporada=1')).toBeInTheDocument()
  })

  it('sin temporadas creadas, lo explica', async () => {
    renderHome(vi.fn().mockResolvedValue({ seasons: [], competitions: [], initialSeasonId: null }))

    expect(await screen.findByText('Aún no hay ninguna temporada.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Plantilla y dorsales/ })).toHaveTextContent('Primero, crea una temporada')
    expect(screen.getByRole('link', { name: /Temporadas/ })).toHaveAttribute('href', '/admin/temporadas')
  })

  it('enlaza a las temporadas, con la elegida en la URL, y dice cuál es la actual', async () => {
    renderHome(vi.fn().mockResolvedValue(FILTERS), '/admin?temporada=1')

    const link = await screen.findByRole('link', { name: /Temporadas y competiciones 2026\/27 es la actual/ })
    expect(link).toHaveAttribute('href', '/admin/temporadas?temporada=1')
  })

  it('enlaza a los jugadores, con la temporada elegida en la URL', async () => {
    renderHome(vi.fn().mockResolvedValue(FILTERS), '/admin?temporada=1')

    expect(await screen.findByRole('link', { name: /Jugadores/ })).toHaveAttribute(
      'href',
      '/admin/jugadores?temporada=1',
    )
  })

  it('cada sección es una tarjeta con su icono decorativo, y se lee por su nombre y su nota', async () => {
    renderHome(vi.fn().mockResolvedValue(FILTERS))

    const sections = await screen.findByRole('navigation', { name: 'Secciones del panel' })
    const cards = within(sections).getAllByRole('link')
    expect(cards.map((card) => card.textContent)).toEqual([
      'Partidos Convocatoria, goles y cierre',
      'Temporadas y competiciones 2026/27 es la actual',
      'Jugadores Fichas, correos y archivados',
      'Plantilla y dorsales Quién juega en 2026/27',
      'Votantes Viewers que votan en 2026/27',
    ])
    for (const card of cards) {
      const icon = card.querySelector('svg')
      expect(icon).toHaveAttribute('aria-hidden', 'true')
      expect(icon.children.length).toBeGreaterThan(0)
    }
  })

  it('enlaza a la plantilla de la temporada elegida', async () => {
    renderHome(vi.fn().mockResolvedValue(FILTERS), '/admin?temporada=1')

    expect(await screen.findByRole('link', { name: 'Plantilla y dorsales Quién juega en 2025/26' })).toHaveAttribute(
      'href',
      '/admin/plantilla?temporada=1',
    )
  })

  it('enlaza a los votantes de la temporada elegida', async () => {
    renderHome(vi.fn().mockResolvedValue(FILTERS), '/admin?temporada=1')

    expect(await screen.findByRole('link', { name: 'Votantes Viewers que votan en 2025/26' })).toHaveAttribute(
      'href',
      '/admin/votantes?temporada=1',
    )
  })

  it('enlaza a los partidos de la temporada elegida', async () => {
    renderHome(vi.fn().mockResolvedValue(FILTERS), '/admin?temporada=1')

    expect(await screen.findByRole('link', { name: /^Partidos/ })).toHaveAttribute(
      'href',
      '/admin/partidos?temporada=1',
    )
  })

  it('si no se puede cargar, lo dice', async () => {
    renderHome(vi.fn().mockRejectedValue(new Error('x')))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar el panel.')
  })

  it('tras un fallo, «Reintentar» vuelve a cargarlo', async () => {
    renderHome(vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue(FILTERS))

    await userEvent.click(await screen.findByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByLabelText('Temporada')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('partidos por terminar', () => {
  afterEach(() => vi.useRealTimers())
  // Partidos ya jugados (antes del 26 nov) sin terminar; uno por jugar y uno terminado no cuentan.
  const match = (id, date, isFinished = false) => ({ id, date, isFinished })
  const MATCHES = [
    match(1, new Date(2026, 10, 22, 18, 30)),
    match(2, new Date(2026, 10, 15, 18, 30)),
    match(3, new Date(2026, 10, 29, 18, 30)),
    match(4, new Date(2026, 10, 8, 18, 30), true),
  ]

  it('avisa de los partidos jugados sin terminar de la temporada elegida y enlaza a ellos', async () => {
    vi.useFakeTimers({ now: new Date(2026, 10, 26, 12, 0), toFake: ['Date'] })
    const listMatches = vi.fn().mockResolvedValue({ matches: MATCHES })
    renderHome(vi.fn().mockResolvedValue(FILTERS), '/admin?temporada=2', listMatches)

    const pending = await screen.findByRole('region', { name: 'Pendiente' })
    expect(within(pending).getByRole('link', { name: '2 partidos por terminar' })).toHaveAttribute(
      'href',
      '/admin/partidos?temporada=2',
    )
    expect(listMatches).toHaveBeenCalledWith(2)
  })

  it('con uno, en singular', async () => {
    vi.useFakeTimers({ now: new Date(2026, 10, 26, 12, 0), toFake: ['Date'] })
    renderHome(
      vi.fn().mockResolvedValue(FILTERS),
      '/admin?temporada=2',
      vi.fn().mockResolvedValue({ matches: [MATCHES[0]] }),
    )

    expect(await screen.findByRole('link', { name: '1 partido por terminar' })).toBeInTheDocument()
  })

  it('sin partidos pendientes (o si no se pueden cargar), no hay aviso', async () => {
    renderHome(vi.fn().mockResolvedValue(FILTERS), '/admin?temporada=2', vi.fn().mockRejectedValue(new Error('x')))

    expect(await screen.findByRole('navigation', { name: 'Secciones del panel' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Pendiente' })).not.toBeInTheDocument()
  })
})
