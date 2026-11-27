import { Link, useLocation } from 'react-router'
import { matchState } from '../../../../domain/match'
import { useAsync } from '../../use-async'
import { useSeasonFilters } from '../../use-season-filters'
import { useUseCases } from '../../use-cases-context'
import Icon from '../Icon'
import SeasonFilters from '../SeasonFilters'
import LoadError from './LoadError'

/** Inicio del panel de admin (docs/SPEC.md §12): una tarjeta con icono por sección. Cada sección nueva añade la suya. */
export default function AdminHome() {
  const season = useSeasonFilters()
  const { listMatches } = useUseCases()
  // Avisos: partidos ya jugados sin terminar. Si no se pueden cargar, simplemente no hay aviso.
  const { data: matches } = useAsync(
    season.seasonId ? () => listMatches(season.seasonId) : () => new Promise(() => {}),
    season.seasonId,
  )
  const count = (key) => matches?.matches.filter((m) => matchState(m).key === key).length ?? 0
  // Avisos del inicio: lo que falta por hacer en los partidos de la temporada.
  const pending = [
    { n: count('unfinished'), one: 'partido por terminar', many: 'partidos por terminar' },
    { n: count('mvpTie'), one: 'empate de MVP', many: 'empates de MVP' },
  ].filter((p) => p.n > 0)
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
      {pending.length > 0 && (
        <section aria-labelledby="pendiente" className="rounded-lg bg-surface px-4 py-1">
          <h2 id="pendiente" className="sr-only">
            Pendiente
          </h2>
          {pending.map(({ n, one, many }) => (
            <Link
              key={one}
              to={{ pathname: '/admin/partidos', search }}
              className="flex min-h-14 items-center justify-between gap-3 border-line not-first:border-t"
            >
              <span className="flex items-baseline gap-3">
                <span className="type-name text-accent-text tabular-nums">{n}</span>{' '}
                <span className="type-body">{n === 1 ? one : many}</span>
              </span>
              <span aria-hidden="true" className="text-text-muted">
                ›
              </span>
            </Link>
          ))}
        </section>
      )}
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
