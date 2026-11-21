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

/** Fila de get_squad_stats → SquadPlayer. `photoUrl` traduce la ruta del bucket a una URL pública. */
export function toSquadPlayer(row, photoUrl) {
  return {
    id: row.player_id,
    name: playerName({ nickname: row.nickname, firstName: row.first_name }),
    shirtNumber: row.shirt_number,
    position: row.position,
    photoUrl: row.photo_path ? photoUrl(row.photo_path) : null,
    matchesPlayed: Number(row.matches_played),
    goals: Number(row.goals),
    assists: Number(row.assists),
    yellowCards: Number(row.yellow_cards),
    redCards: Number(row.red_cards),
    avgRating: row.avg_rating === null ? null : Number(row.avg_rating),
    mvps: Number(row.mvps),
    goalsConceded: Number(row.goals_conceded),
  }
}
