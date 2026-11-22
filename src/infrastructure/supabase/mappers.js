// Traducen lo que devuelve Supabase (snake_case, objetos grandes) a los objetos que usa la aplicación.
import { playerName } from '../../domain/squad'

export function toSessionUser(session) {
  return session ? { id: session.user.id, email: session.user.email } : null
}

export function toProfile(row) {
  return row ? { id: row.id, email: row.email, fullName: row.full_name, role: row.role } : null
}

export function toSeason(row) {
  return { id: row.id, name: row.name, isCurrent: row.is_current }
}

const numberOrNull = (value) => (value === null ? null : Number(value))

/** Fila de get_squad_stats → SquadPlayer. `photoUrl` traduce la ruta del bucket a una URL pública. */
export function toSquadPlayer(row, photoUrl) {
  return {
    id: row.player_id,
    name: playerName({ nickname: row.nickname, firstName: row.first_name }),
    fullName: `${row.first_name} ${row.last_name}`,
    shirtNumber: row.shirt_number,
    position: row.position,
    status: row.status,
    photoUrl: row.photo_path ? photoUrl(row.photo_path) : null,
    matchesCalled: Number(row.matches_called),
    matchesPlayed: Number(row.matches_played),
    minutes: Number(row.minutes),
    goals: Number(row.goals),
    assists: Number(row.assists),
    penaltyGoals: Number(row.penalty_goals),
    yellowCards: Number(row.yellow_cards),
    redCards: Number(row.red_cards),
    avgRating: numberOrNull(row.avg_rating),
    ratedMatches: Number(row.rated_matches),
    mvps: Number(row.mvps),
    // La RPC solo los da para el portero (null en el resto): en la app, 0.
    goalsConceded: Number(row.goals_conceded),
    cleanSheets: Number(row.clean_sheets),
  }
}

/** Fila de get_player_rating_timeline → RatingPoint. */
export function toRatingPoint(row) {
  return {
    matchId: row.match_id,
    label: row.label,
    opponent: row.opponent,
    rating: Number(row.rating),
    cumulativeAvg: Number(row.cumulative_avg),
    teamAvg: Number(row.team_avg),
  }
}

/** Fila de get_player_match_log → MatchLogEntry, con las fechas como Date. */
export function toMatchLogEntry(row) {
  return {
    matchId: row.match_id,
    date: new Date(row.match_date),
    label: row.label,
    opponent: row.opponent,
    minutes: Number(row.minutes),
    goals: Number(row.goals),
    assists: Number(row.assists),
    goalsConceded: numberOrNull(row.goals_conceded),
    rating: numberOrNull(row.rating),
    isMvp: row.is_mvp,
    votingClosesAt: new Date(row.voting_closes_at),
  }
}
