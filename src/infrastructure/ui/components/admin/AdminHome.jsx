import { useSeasonFilters } from '../../use-season-filters'
import SeasonFilters from '../SeasonFilters'

/** Inicio del panel de admin (docs/SPEC.md §12). Cada sección que se construye añade aquí su enlace. */
export default function AdminHome() {
  const season = useSeasonFilters()

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 pb-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="type-display">Panel</h1>
        <SeasonFilters {...season} showCompetition={false} />
      </header>
      {season.failed && (
        <p role="alert" className="type-small text-danger">
          No se pudo cargar el panel. Inténtalo de nuevo.
        </p>
      )}
      {season.filters?.initialSeasonId === null && <p className="text-text-muted">Aún no hay ninguna temporada.</p>}
    </main>
  )
}
