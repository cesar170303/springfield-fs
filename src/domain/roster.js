// Reglas de la plantilla de cada temporada en el panel de admin (docs/SPEC.md §12). Un hueco de la plantilla es
// { playerId, shirtNumber }.
import { playerName } from './squad'

/** Fichas que se pueden añadir: no archivadas y que aún no están en la plantilla, por el nombre que se ve. */
export function playersToAdd(players, roster) {
  const inRoster = new Set(roster.map((r) => r.playerId))
  return players
    .filter((p) => !p.archived && !inRoster.has(p.id))
    .sort((a, b) => playerName(a).localeCompare(playerName(b), 'es'))
}

/** La temporada que empezó justo antes que `seasonId` (null si es la primera). Las fechas son 'AAAA-MM-DD'. */
export function previousSeason(seasons, seasonId) {
  const current = seasons.find((s) => s.id === seasonId)
  if (!current) return null
  const earlier = seasons.filter((s) => s.startDate < current.startDate)
  return earlier.sort((a, b) => b.startDate.localeCompare(a.startDate))[0] ?? null
}

/** Lo que se copia de una plantilla anterior: sus jugadores no archivados, con el mismo dorsal. */
export function rosterToCopy(roster, players) {
  const archived = new Set(players.filter((p) => p.archived).map((p) => p.id))
  return roster.filter((r) => !archived.has(r.playerId))
}
