import { useEffect, useState } from 'react'
import { useUseCases } from '../use-cases-context'
import LeaderCards from './LeaderCards'
import SquadTable from './SquadTable'

const select = 'min-w-0 rounded-md border border-border bg-bg px-3 py-2 type-small'

/** Pantalla de la plantilla (docs/SPEC.md §5): tarjetas de líderes o lista, por temporada y competición. */
export default function SquadScreen({ onSignOut }) {
  const { getSquadFilters, getSquadStats } = useUseCases()
  const [filters, setFilters] = useState(null)
  const [seasonId, setSeasonId] = useState(null)
  const [competitionId, setCompetitionId] = useState(null) // null = todas
  const [filtersFailed, setFiltersFailed] = useState(false)
  // Cada respuesta se guarda con los filtros que la pidieron: si no son los de ahora, está cargando.
  const [result, setResult] = useState({ key: null, players: null, failed: false })
  const [view, setView] = useState('cards')
  const key = `${seasonId}-${competitionId}`
  const current = result.key === key ? result : { players: null, failed: false }
  const players = current.players // null = cargando
  const failed = filtersFailed || current.failed

  useEffect(() => {
    let stale = false
    getSquadFilters()
      .then((f) => {
        if (stale) return
        setFilters(f)
        setSeasonId(f.initialSeasonId)
      })
      .catch(() => !stale && setFiltersFailed(true))
    return () => {
      stale = true
    }
  }, [getSquadFilters])

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
    return view === 'cards' ? (
      <LeaderCards key={`${seasonId}-${competitionId}`} players={players} />
    ) : (
      <SquadTable players={players} />
    )
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="type-display">Plantilla</h1>
        <div className="flex items-center gap-2">
          {players?.length > 0 && (
            <button
              type="button"
              onClick={() => setView(view === 'cards' ? 'list' : 'cards')}
              className="rounded-md border border-border px-3 py-2 type-small whitespace-nowrap"
            >
              {view === 'cards' ? 'Mostrar como lista' : 'Mostrar como tarjetas'}
            </button>
          )}
          {onSignOut && (
            <button type="button" onClick={onSignOut} className="px-2 py-2 type-small text-text-muted underline">
              Salir
            </button>
          )}
        </div>
      </header>

      {filters?.seasons.length > 0 && (
        <div className="flex gap-2">
          <select
            aria-label="Temporada"
            value={seasonId ?? ''}
            onChange={(e) => setSeasonId(Number(e.target.value))}
            className={select}
          >
            {filters.seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Competición"
            value={competitionId ?? ''}
            onChange={(e) => setCompetitionId(e.target.value ? Number(e.target.value) : null)}
            className={select}
          >
            <option value="">Todas</option>
            {filters.competitions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {content()}
    </main>
  )
}
