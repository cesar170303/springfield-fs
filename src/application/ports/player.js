// Port de la ficha del jugador: lo que la aplicación necesita, además de los totales de la plantilla (ports/squad.js).
// Solo documentación (JSDoc): JavaScript no tiene interfaces.

/**
 * @typedef {{
 *   matchId: number, label: string, opponent: string,
 *   rating: number, cumulativeAvg: number, teamAvg: number
 * }} RatingPoint un partido con la votación cerrada: su nota, su media acumulada y la media del equipo
 *
 * @typedef {{
 *   matchId: number, date: Date, label: string, opponent: string,
 *   minutes: number, goals: number, assists: number, goalsConceded: number | null,
 *   rating: number | null, isMvp: boolean, votingClosesAt: Date
 * }} MatchLogEntry un partido jugado; `rating` es null y `isMvp` false mientras la votación esté abierta.
 *   `goalsConceded` solo para el portero
 *
 * @typedef {object} PlayerRepository
 * @property {(q: { playerId: number, seasonId: number }) => Promise<RatingPoint[]>} getRatingTimeline
 *   del primer partido al último
 * @property {(q: { playerId: number, seasonId: number, competitionId: number | null }) => Promise<MatchLogEntry[]>}
 *   getMatchLog del más reciente al más antiguo; `competitionId` null = todas
 */

export {}
