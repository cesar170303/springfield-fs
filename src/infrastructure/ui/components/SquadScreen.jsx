import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router'
import { useUseCases } from '../use-cases-context'
import { useSeasonFilters } from '../use-season-filters'
import LeaderCards from './LeaderCards'
import SeasonFilters from './SeasonFilters'
import SquadTable from './SquadTable'

/** Pantalla de la plantilla (docs/SPEC.md §5): tarjetas de líderes o lista, por temporada y competición. */
export default function SquadScreen() {
  const { getSquadStats } = useUseCases()
  // Del marco de la app (AppShell); sin marco (tests, o fuera de la app), sin aviso.
  const { pendingVotes = 0 } = useOutletContext() ?? {}
  const season = useSeasonFilters()
  const { filters, seasonId, competitionId } = season
  // Cada respuesta se guarda con los filtros que la pidieron: si no son los de ahora, está cargando.
  const [result, setResult] = useState({ key: null, players: null, failed: false })
  const [view, setView] = useState('cards')
  const key = `${seasonId}-${competitionId}`
  const current = result.key === key ? result : { players: null, failed: false }
  const players = current.players // null = cargando
  const failed = season.failed || current.failed

  useEffect(() => {
    if (seasonId === null) return
    let stale = false // si cambian los filtros antes de que llegue la respuesta, esa respuesta ya no vale
    const requested = `${seasonId}-${competitionId}`
    getSquadStats({ seasonId, competitionId })
      .then((p) => !stale && setResult({ key: requested, players: p, failed: false }))
      .catch(() => !stale && setResult({ key: requested, players: null, failed: true }))
    return () => {
      stale = true
    }
  }, [getSquadStats, seasonId, competitionId])

  function content() {
    if (failed) {
      return (
        <p role="alert" className="type-small text-danger">
          No se pudo cargar la plantilla. Inténtalo de nuevo.
        </p>
      )
    }
    if (filters && filters.initialSeasonId === null)
      return <p className="text-text-muted">Aún no hay ninguna temporada.</p>
    if (!players) return <p className="text-text-muted">Cargando…</p>
    if (players.length === 0) return <p className="text-text-muted">Todavía no hay estadísticas en esta temporada.</p>
    // La key vuelve a montar las tarjetas al cambiar de filtros: así las cifras vuelven a rodar.
    return view === 'cards' ? <LeaderCards key={key} players={players} /> : <SquadTable players={players} />
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="type-display">Plantilla</h1>
        {players?.length > 0 && (
          <button
            type="button"
            onClick={() => setView(view === 'cards' ? 'list' : 'cards')}
            className="rounded-md border border-border px-3 py-2 type-small whitespace-nowrap"
          >
            {view === 'cards' ? 'Mostrar como lista' : 'Mostrar como tarjetas'}
          </button>
        )}
      </header>

      {pendingVotes > 0 && (
        <Link
          to="/votar"
          className="flex items-center justify-between gap-3 rounded-lg bg-accent px-4 py-3 text-on-accent"
        >
          <span className="flex flex-col">
            <span className="type-label font-semibold tracking-widest uppercase">Votación abierta</span>
            <span className="type-title">
              Te faltan {pendingVotes} {pendingVotes === 1 ? 'compañero' : 'compañeros'}
            </span>
          </span>
          <span aria-hidden="true" className="type-name">
            →
          </span>
        </Link>
      )}

      <SeasonFilters {...season} />

      {content()}
    </main>
  )
}
