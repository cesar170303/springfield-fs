// Reglas de los partidos y sus competiciones (docs/SPEC.md §3, §4 y §12).

/** Tipos de competición, en el orden en que se ofrecen. */
export const COMPETITION_TYPES = [
  { value: 'league', label: 'Liga' },
  { value: 'cup', label: 'Copa' },
  { value: 'friendly', label: 'Amistoso' },
]

export const competitionTypeLabel = (type) => COMPETITION_TYPES.find((t) => t.value === type)?.label

const LABEL_PREFIX = { league: 'J', cup: 'Copa J', friendly: 'Amistoso J' }

/** Etiqueta del partido, igual que la que calcula la base de datos para la gráfica: J5, Copa J2, Amistoso J1. */
export const matchLabel = (competitionType, round) => `${LABEL_PREFIX[competitionType]}${round}`

const VOTING_DAYS = 7

/** La votación de un partido se cierra 7 días después de su fecha (§6). */
export const votingClosesAt = (date) => new Date(date.getTime() + VOTING_DAYS * 24 * 60 * 60 * 1000)

/**
 * Estado de un partido en el panel: 'upcoming' (por jugar), 'unfinished' (jugado y sin terminar), 'voting' (terminado,
 * con la votación abierta hasta `closesAt`) o 'closed' (votación cerrada).
 */
export function matchState({ date, isFinished }, now = new Date()) {
  if (!isFinished) return { key: date > now ? 'upcoming' : 'unfinished' }
  const closesAt = votingClosesAt(date)
  return closesAt > now ? { key: 'voting', closesAt } : { key: 'closed' }
}

/** Solo un partido que ya se ha jugado (o que empieza ahora) puede tener resultado. */
export const canHaveResult = (date, now = new Date()) => date <= now

/** Jornada que se propone para un partido nuevo: la siguiente a la última de esa competición (1 si no hay ninguna). */
export function nextRound(matches, competitionId) {
  const rounds = matches.filter((m) => m.competitionId === competitionId).map((m) => m.round)
  return rounds.length ? Math.max(...rounds) + 1 : 1
}

/**
 * Un convocado se puede quitar de la convocatoria si no tiene goles, asistencias ni penaltis fallados apuntados en el
 * partido (si los tiene, la base de datos tampoco lo deja: hay que borrarlos antes).
 */
export function canLeaveSquad(playerId, { goals, missedPenalties }) {
  return (
    !goals.some((g) => g.scorerId === playerId || g.assistId === playerId) &&
    !missedPenalties.some((p) => p.playerId === playerId)
  )
}
