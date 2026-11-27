// Port de la votación: lo que la aplicación necesita para votar a los compañeros.
// Solo documentación (JSDoc): JavaScript no tiene interfaces.

/**
 * @typedef {{ id: number, name: string, position: string, photoUrl: string | null, shirtNumber: number | null }} VotePlayer
 *
 * @typedef {{
 *   matchId: number, matchDate: Date, label: string, opponent: string,
 *   goalsFor: number, goalsAgainst: number, votingClosesAt: Date,
 *   player: VotePlayer, minutes: number, goals: number, assists: number, goalsConceded: number | null,
 *   myScore: number | null
 * }} OpenVote un compañero al que puedes votar en un partido con la votación abierta. `myScore` es tu nota si ya
 *   le votaste (null = pendiente); nunca hay notas de otros. `goalsConceded`, solo para el portero
 *
 * @typedef {object} VoteRepository
 * @property {() => Promise<OpenVote[]>} getMyOpenVotes lo que la cuenta actual puede votar ahora
 * @property {(v: { matchId: number, playerId: number, score: number }) => Promise<void>} castVote guarda un voto
 *   definitivo; lanza un error legible si la base de datos no lo acepta
 */

export {}
