import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useUseCases } from './use-cases-context'

/**
 * Temporada y competición elegidas. Viven en la URL (?temporada=&competicion=, ADR-0004): la plantilla y la ficha
 * las comparten y se mantienen al volver atrás. Si la URL no trae temporada, pone la inicial.
 */
export function useSeasonFilters() {
  const { getSquadFilters } = useUseCases()
  const [filters, setFilters] = useState(null)
  const [failed, setFailed] = useState(false)
  const [params, setParams] = useSearchParams()
  const seasonId = Number(params.get('temporada')) || null
  const competitionId = Number(params.get('competicion')) || null // null = todas
  // replace: cambiar un filtro no añade un paso más al botón «atrás».
  const setFilter = (name, value) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value === null) next.delete(name)
        else next.set(name, value)
        return next
      },
      { replace: true },
    )

  useEffect(() => {
    let stale = false
    getSquadFilters()
      .then((f) => {
        if (stale) return
        setFilters(f)
        // La temporada inicial solo se pone si la URL no trae ninguna.
        if (f.initialSeasonId !== null && !seasonId) setFilter('temporada', f.initialSeasonId)
      })
      .catch(() => !stale && setFailed(true))
    return () => {
      stale = true
    }
  }, [getSquadFilters]) // eslint-disable-line react-hooks/exhaustive-deps -- solo al montar

  return {
    filters,
    failed,
    seasonId,
    competitionId,
    setSeason: (id) => setFilter('temporada', id),
    setCompetition: (id) => setFilter('competicion', id),
  }
}
