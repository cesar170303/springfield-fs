// Reglas de la pantalla de la plantilla (docs/SPEC.md §5). Los totales ya vienen calculados de `get_squad_stats`:
// aquí solo se ordenan, agrupan y eligen.

/** El apodo es el nombre del jugador; si no tiene, su nombre de pila. */
export const playerName = ({ nickname, firstName }) => nickname || firstName

// Orden de la pista, de atrás adelante.
const POSITIONS = [
  ['goalkeeper', 'Portero'],
  ['defender', 'Cierre'],
  ['winger', 'Ala'],
  ['pivot', 'Pívot'],
  ['universal', 'Universal'],
]

/** Nombre de la posición, como en la pista ('winger' → 'Ala'). */
export const positionLabel = (position) => POSITIONS.find(([key]) => key === position)?.[1]

/** Posiciones para elegir en un formulario, en el orden de la pista. */
export const POSITION_OPTIONS = POSITIONS.map(([value, label]) => ({ value, label }))

// Valor de cada estadística por la que se puede ordenar. Sin nota (null) cuenta como lo más bajo; en tarjetas, una
// roja pesa más que cualquier número de amarillas.
const VALUE = {
  goals: (p) => p.goals,
  assists: (p) => p.assists,
  goalsPlusAssists: (p) => p.goals + p.assists,
  avgRating: (p) => p.avgRating ?? -1,
  mvps: (p) => p.mvps,
  matchesPlayed: (p) => p.matchesPlayed,
  cards: (p) => p.redCards * 1000 + p.yellowCards,
}

/** Tarjetas de líderes, en el orden decidido por el propietario. */
export const LEADER_STATS = [
  { key: 'goals', label: 'Goleadores' },
  { key: 'assists', label: 'Asistencias' },
  { key: 'goalsPlusAssists', label: 'Goles + asistencias' },
  { key: 'avgRating', label: 'Valoración media' },
  { key: 'mvps', label: 'MVPs' },
  { key: 'cards', label: 'Tarjetas' },
].map((s) => ({ ...s, value: VALUE[s.key] }))

const byShirt = (a, b) => a.shirtNumber - b.shirtNumber

/** 'shirt' ordena por dorsal; cualquier otra clave, de mayor a menor y, si empatan, por dorsal. */
export function sortSquad(players, by) {
  if (by === 'shirt') return [...players].sort(byShirt)
  const value = VALUE[by]
  return [...players].sort((a, b) => value(b) - value(a) || byShirt(a, b))
}

/** Grupos por posición, en el orden de la pista, ordenados por dorsal y sin grupos vacíos. */
export function groupByPosition(players) {
  return POSITIONS.map(([position, label]) => ({
    position,
    label,
    players: sortSquad(
      players.filter((p) => p.position === position),
      'shirt',
    ),
  })).filter((g) => g.players.length)
}

/** Los 3 mejores en una estadística de LEADER_STATS; quien tiene 0 o no tiene nota no aparece. */
export function topThree(players, stat) {
  return sortSquad(
    players.filter((p) => stat.value(p) > 0),
    stat.key,
  ).slice(0, 3)
}
