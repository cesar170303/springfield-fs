// Reglas de la ficha del jugador (docs/SPEC.md §5 y §7). Los totales ya vienen calculados de `get_squad_stats` y la
// nota de cada partido de `get_player_rating_timeline`: aquí solo se eligen, se describen y se escalan.

const RATING_MIN = 1
const RATING_MAX = 10

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

const STATUS = { available: 'Disponible', injured: 'Lesionado', suspended: 'Sancionado' }

/** Estado del jugador (lo cambia el admin), como se lee en la ficha. */
export const statusLabel = (status) => STATUS[status]

/**
 * Las seis cifras de la ficha, en el orden decidido por el propietario. Al portero, goles encajados y porterías a cero
 * en lugar de goles y asistencias. Una sola va destacada (`highlight`).
 */
export function statCards(p) {
  const keeper = p.position === 'goalkeeper'
  return [
    {
      key: 'matchesPlayed',
      label: 'Partidos jugados',
      value: p.matchesPlayed,
      note: `de ${plural(p.matchesCalled, 'convocatoria', 'convocatorias')}`,
    },
    {
      key: 'minutes',
      label: 'Minutos',
      value: p.minutes,
      note: p.matchesPlayed ? `${Math.round(p.minutes / p.matchesPlayed)} por partido` : null,
    },
    keeper
      ? { key: 'goalsConceded', label: 'Goles encajados', value: p.goalsConceded, note: null }
      : {
          key: 'goals',
          label: 'Goles',
          value: p.goals,
          note: p.penaltyGoals ? `${p.penaltyGoals} de penalti` : null,
          highlight: true,
        },
    keeper
      ? { key: 'cleanSheets', label: 'Porterías a cero', value: p.cleanSheets, note: null, highlight: true }
      : {
          key: 'assists',
          label: 'Asistencias',
          value: p.assists,
          note: `${plural(p.goals + p.assists, 'gol', 'goles')} + asist.`,
        },
    { key: 'mvps', label: 'MVP', value: p.mvps, note: 'mejor del partido' },
    {
      key: 'cards',
      label: 'Tarjetas',
      yellow: p.yellowCards,
      red: p.redCards,
      note: `${plural(p.yellowCards, 'amarilla', 'amarillas')} · ${plural(p.redCards, 'roja', 'rojas')}`,
    },
  ]
}

/** Parte del medidor de media luna que se llena con una nota de 1 a 10 (0 = vacío). Sin nota, vacío. */
export function ratingFraction(rating) {
  if (rating === null) return 0
  return Math.min(1, Math.max(0, (rating - RATING_MIN) / (RATING_MAX - RATING_MIN)))
}

/**
 * Escala vertical de la gráfica: de un punto por debajo del valor más bajo (nota, su media o la del equipo) hasta 10,
 * para que se vean las diferencias. Nunca por debajo de 1.
 */
export function ratingRange(points) {
  const values = points.flatMap((p) => [p.rating, p.cumulativeAvg, p.teamAvg])
  if (!values.length) return { min: RATING_MIN, max: RATING_MAX }
  return { min: Math.max(RATING_MIN, Math.floor(Math.min(...values)) - 1), max: RATING_MAX }
}

/** Un partido en una línea: los minutos y, si los hay, goles, asistencias (al portero, encajados) y MVP. */
export function matchSummary(m) {
  const parts = [`${m.minutes}'`]
  if (m.goals) parts.push(plural(m.goals, 'gol', 'goles'))
  if (m.assists) parts.push(`${m.assists} asist.`)
  if (m.goalsConceded !== null) {
    parts.push(m.goalsConceded ? plural(m.goalsConceded, 'encajado', 'encajados') : 'portería a cero')
  }
  if (m.isMvp) parts.push('MVP')
  return parts.join(' · ')
}

/** La votación de un partido sigue abierta hasta la fecha de cierre que calcula la base de datos (7 días). */
export const isVotingOpen = ({ votingClosesAt }, now = new Date()) => votingClosesAt > now
