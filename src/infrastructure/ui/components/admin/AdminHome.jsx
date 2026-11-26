import { Link, useLocation } from 'react-router'
import { useSeasonFilters } from '../../use-season-filters'
import Icon from '../Icon'
import SeasonFilters from '../SeasonFilters'
import LoadError from './LoadError'

/** Inicio del panel de admin (docs/SPEC.md §12): una tarjeta con icono por sección. Cada sección nueva añade la suya. */
export default function AdminHome() {
  const season = useSeasonFilters()
  const { search } = useLocation()
  const current = season.filters?.seasons.find((s) => s.isCurrent)
  // Mientras la URL aún no trae temporada, la inicial (la que va a poner).
  const selected = season.filters?.seasons.find((s) => s.id === (season.seasonId ?? season.filters.initialSeasonId))
  const sections = [
    { to: '/admin/partidos', icon: 'ball', name: 'Partidos', note: 'Convocatoria, goles y cierre' },
    {
      to: '/admin/temporadas',
      icon: 'calendar',
      name: 'Temporadas y competiciones',
      note: current ? `${current.name} es la actual` : 'Ninguna marcada como actual',
    },
    { to: '/admin/jugadores', icon: 'players', name: 'Jugadores', note: 'Fichas, correos y archivados' },
    {
      to: '/admin/plantilla',
      icon: 'shirt',
      name: 'Plantilla y dorsales',
      note: selected ? `Quién juega en ${selected.name}` : 'Primero, crea una temporada',
    },
    {
      to: '/admin/votantes',
      icon: 'vote',
      name: 'Votantes',
      note: selected ? `Viewers que votan en ${selected.name}` : 'Primero, crea una temporada',
    },
  ]

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 pb-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="type-display">Panel</h1>
        <SeasonFilters {...season} showCompetition={false} />
      </header>
      {season.failed && <LoadError message="No se pudo cargar el panel." onRetry={season.retry} />}
      {season.filters?.initialSeasonId === null && <p className="text-text-muted">Aún no hay ninguna temporada.</p>}
      {season.filters && (
        <nav aria-label="Secciones del panel" className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {sections.map(({ to, icon, name, note }) => (
            <Link
              key={to}
              to={{ pathname: to, search }}
              className="flex min-h-32 flex-col justify-between gap-3 rounded-lg bg-surface p-4 hover:bg-line"
            >
              <span className="text-accent-text">
                <Icon name={icon} className="size-7" />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="type-body font-semibold">{name}</span>{' '}
                <span className="type-small text-text-muted">{note}</span>
              </span>
            </Link>
          ))}
        </nav>
      )}
    </main>
  )
}
