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
 * con la votación abierta hasta `closesAt`), 'closed' (votación cerrada) o 'mvpTie' (cerrada, con un empate en la
 * mejor media que el admin aún no ha resuelto).
 */
export function matchState({ date, isFinished, mvpTiePending = false }, now = new Date()) {
  if (!isFinished) return { key: date > now ? 'upcoming' : 'unfinished' }
  const closesAt = votingClosesAt(date)
  if (closesAt > now) return { key: 'voting', closesAt }
  return { key: mvpTiePending ? 'mvpTie' : 'closed' }
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

/** Tipos de gol, como en la base de datos. Un penalti (o doble penalti) nunca lleva asistencia. */
export const GOAL_TYPES = [
  { value: 'regular', label: 'Normal' },
  { value: 'penalty', label: 'Penalti' },
  { value: 'double_penalty', label: 'Doble penalti' },
]

/** Tipos de penalti fallado. */
export const PENALTY_TYPES = GOAL_TYPES.filter((t) => t.value !== 'regular')

/** Quién puede marcar (o fallar un penalti): los convocados que jugaron, con minutos. */
export const scorerOptions = (squad) => squad.filter((p) => p.called && p.minutes > 0)

/** Quién puede dar la asistencia: los mismos, menos el goleador. */
export const assistOptions = (squad, scorerId) => scorerOptions(squad).filter((p) => p.playerId !== scorerId)

/**
 * El marcador manda (§12): puede haber menos goles apuntados que goles a favor (un gol en propia puerta del rival no
 * se apunta). Devuelve cuántos faltan; sin resultado, 0.
 */
export const missingGoals = (goalsFor, recorded) => (goalsFor === null ? 0 : Math.max(0, goalsFor - recorded))

/** Una línea por gol: «Asistencia de Checo», «Sin asistencia», «Penalti» o «Doble penalti». `nameOf(id)` da el nombre. */
export function goalDetail({ type, assistId }, nameOf) {
  if (type !== 'regular') return GOAL_TYPES.find((t) => t.value === type).label
  return assistId ? `Asistencia de ${nameOf(assistId)}` : 'Sin asistencia'
}

/**
 * Lo que falta para poder terminar un partido (§12): resultado, que ya se haya jugado y alguien con minutos. Vacío si
 * se puede terminar. (Los goles sin goleador no bloquean: el marcador manda.)
 */
export function finishBlockers({ date, goalsFor, playersWithMinutes }, now = new Date()) {
  const blockers = []
  if (goalsFor === null) blockers.push('Falta el resultado (en «Datos del partido»).')
  if (!canHaveResult(date, now)) blockers.push('El partido aún no se ha jugado.')
  if (playersWithMinutes === 0)
    blockers.push('Nadie tiene minutos: guarda la convocatoria con los minutos de cada uno.')
  return blockers
}

/** Al terminar el partido: hasta cuándo estará abierta la votación (7 días desde el partido) o si ya no habrá. */
export function votingAfterFinish(date, now = new Date()) {
  const closesAt = votingClosesAt(date)
  return closesAt > now ? { open: true, closesAt } : { open: false }
}
