import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useUseCases } from './use-cases-context'

/**
 * Temporada y competición elegidas. Viven en la URL (?temporada=&competicion=, ADR-0004): la plantilla y la ficha
 * las comparten y se mantienen al volver atrás. Si la URL no trae temporada, o ya no existe, pone la inicial.
 */
export function useSeasonFilters() {
  const { getSquadFilters } = useUseCases()
  const [filters, setFilters] = useState(null)
  const [failed, setFailed] = useState(false)
  const [params, setParams] = useSearchParams()
  const seasonId = Number(params.get('temporada')) || null
  const competitionId = Number(params.get('competicion')) || null // null = todas
  // replace: cambiar un filtro no añade un paso más al botón «atrás».
  const changeUrl = (changes) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [name, value] of Object.entries(changes)) {
          if (value === null) next.delete(name)
          else next.set(name, value)
        }
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
        // Lo que la URL no trae, o ya no existe (el staff puede borrarlo): la temporada inicial y todas las competiciones.
        const exists = (list, id) => list.some((item) => item.id === id)
        const changes = {}
        if (f.initialSeasonId !== null && !exists(f.seasons, seasonId)) changes.temporada = f.initialSeasonId
        if (competitionId !== null && !exists(f.competitions, competitionId)) changes.competicion = null
        if (Object.keys(changes).length) changeUrl(changes)
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
    setSeason: (id) => changeUrl({ temporada: id }),
    setCompetition: (id) => changeUrl({ competicion: id }),
  }
}
