// Reglas de la pantalla de votación (docs/SPEC.md §6). Quién puede votar a quién lo decide la base de datos
// (rls.can_vote); aquí solo se ordena, se barajea y se escribe lo que ya llega permitido.

/** La nota con coma («7,5»), sin decimales si es entera («8»); sin nota, una raya. */
export const formatScore = (score) => (score === null ? '—' : String(score).replace('.', ','))

/** Nota válida: de 1 a 10 en medios puntos (la misma regla que el check de la tabla votes). */
export const isValidScore = (score) =>
  typeof score === 'number' && score >= 1 && score <= 10 && Number.isInteger(score * 2)

const plural = (n, one, many) => (n === 1 ? one : many)

/** Datos del partido de la tarjeta: minutos siempre; goles y asistencias si los hay; al portero, encajados. */
export function voteStats({ minutes, goals, assists, goalsConceded }) {
  const stats = [{ value: minutes, unit: 'min' }]
  if (goalsConceded !== null) stats.push({ value: goalsConceded, unit: plural(goalsConceded, 'encajado', 'encajados') })
  if (goals) stats.push({ value: goals, unit: plural(goals, 'gol', 'goles') })
  if (assists) stats.push({ value: assists, unit: 'asist.' })
  return stats
}

/** Fisher-Yates sobre una copia, con el azar inyectado para poder probarlo. */
function shuffle(list, random) {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * Votos abiertos → un grupo por partido, del que cierra antes al último. `pending`, barajados (orden aleatorio
 * distinto cada vez); `voted`, los que ya tienen tu nota.
 */
export function groupVoteMatches(votes, random) {
  const byMatch = new Map()
  for (const vote of votes) {
    if (!byMatch.has(vote.matchId)) {
      const { matchId, label, opponent, goalsFor, goalsAgainst, matchDate, votingClosesAt } = vote
      byMatch.set(matchId, {
        matchId,
        label,
        opponent,
        goalsFor,
        goalsAgainst,
        matchDate,
        votingClosesAt,
        pending: [],
        voted: [],
      })
    }
    byMatch.get(vote.matchId)[vote.myScore === null ? 'pending' : 'voted'].push(vote)
  }
  return [...byMatch.values()]
    .sort((a, b) => a.votingClosesAt - b.votingClosesAt)
    .map((match) => ({ ...match, pending: shuffle(match.pending, random) }))
}

/** «Saltar por ahora»: el primero pasa al final. Si es el único que queda, no se puede: null. */
export const skipFirst = (queue) => (queue.length > 1 ? [...queue.slice(1), queue[0]] : null)
