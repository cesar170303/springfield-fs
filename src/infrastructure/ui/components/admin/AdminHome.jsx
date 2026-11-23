import { Link, useLocation } from 'react-router'
import { useSeasonFilters } from '../../use-season-filters'
import SeasonFilters from '../SeasonFilters'
import LoadError from './LoadError'

/** Inicio del panel de admin (docs/SPEC.md §12). Cada sección que se construye añade aquí su enlace. */
export default function AdminHome() {
  const season = useSeasonFilters()
  const { search } = useLocation()
  const current = season.filters?.seasons.find((s) => s.isCurrent)
  const sections = [
    {
      to: '/admin/temporadas',
      name: 'Temporadas y competiciones',
      note: current ? `${current.name} es la actual` : 'Ninguna marcada como actual',
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
        <nav aria-label="Secciones del panel" className="grid md:grid-cols-2 md:gap-x-8">
          {sections.map(({ to, name, note }) => (
            <Link
              key={to}
              to={{ pathname: to, search }}
              className="flex min-h-16 items-center justify-between gap-3 border-t border-line"
            >
              <span className="flex flex-col">
                <span className="type-body font-semibold">{name}</span>{' '}
                <span className="type-small text-text-muted">{note}</span>
              </span>
              <span aria-hidden="true" className="text-text-muted">
                ›
              </span>
            </Link>
          ))}
        </nav>
      )}
    </main>
  )
}
