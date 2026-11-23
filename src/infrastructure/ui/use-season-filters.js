import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useUseCases } from './use-cases-context'

/**
 * Temporada y competición elegidas. Viven en la URL (?temporada=&competicion=, ADR-0004): la plantilla y la ficha
 * las comparten y se mantienen al volver atrás. Si la URL no trae temporada, o ya no existe, pone la última que hubo
 * en esta pantalla o, si no, la inicial.
 */
export function useSeasonFilters() {
  const { getSquadFilters } = useUseCases()
  const [filters, setFilters] = useState(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [params, setParams] = useSearchParams()
  const lastSeasonId = useRef(null)
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
        setFailed(false)
      })
      .catch(() => !stale && setFailed(true))
    return () => {
      stale = true
    }
  }, [getSquadFilters, attempt])

  // Repone lo que la URL no trae o ya no existe (el staff puede borrarlo). También al pulsar en la barra la sección en la
  // que ya se está: quita los filtros de la URL sin volver a montar la pantalla.
  useEffect(() => {
    if (!filters) return
    const exists = (list, id) => list.some((item) => item.id === id)
    const changes = {}
    if (exists(filters.seasons, seasonId)) lastSeasonId.current = seasonId
    else if (filters.initialSeasonId !== null) changes.temporada = lastSeasonId.current ?? filters.initialSeasonId
    if (competitionId !== null && !exists(filters.competitions, competitionId)) changes.competicion = null
    if (Object.keys(changes).length) changeUrl(changes)
  }, [filters, seasonId, competitionId]) // eslint-disable-line react-hooks/exhaustive-deps -- changeUrl es nueva en cada render

  return {
    filters,
    failed,
    seasonId,
    competitionId,
    setSeason: (id) => changeUrl({ temporada: id }),
    setCompetition: (id) => changeUrl({ competicion: id }),
    retry: () => setAttempt((n) => n + 1),
  }
}
