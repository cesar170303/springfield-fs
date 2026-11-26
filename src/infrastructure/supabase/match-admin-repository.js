import { readableError } from './errors'
import { toAdminMatch } from './mappers'

// Cuántos convocados tiene cada partido, en la misma consulta. La relación va nombrada: entre matches y match_squad
// hay otro camino (a través de `votes`) y sin nombre PostgREST no sabe cuál usar (PGRST201).
const COLUMNS =
  'id, competition_id, round, match_date, opponent, goals_for, goals_against, is_finished, ' +
  'match_squad!match_squad_match_id_fkey(count)'

const toRow = ({ competitionId, round, date, opponent, goalsFor, goalsAgainst }) => ({
  competition_id: competitionId,
  round,
  match_date: date.toISOString(),
  opponent,
  goals_for: goalsFor,
  goals_against: goalsAgainst,
})

/** @returns {import('../../application/ports/admin').MatchAdminRepository} */
export function createSupabaseMatchAdminRepository(client) {
  const NOT_SAVED = 'No se pudo guardar el partido. Inténtalo de nuevo.'
  const SQUAD_NOT_SAVED = 'No se pudo guardar la convocatoria. Inténtalo de nuevo.'
  // select + single: si RLS ignora el cambio o el borrado no hay fila de vuelta y salta un error.
  const one = (query, id) => query.eq('id', id).select('id').single()

  return {
    async getMatches(seasonId) {
      const { data, error } = await client.from('matches').select(COLUMNS).eq('season_id', seasonId)
      if (error) throw readableError(error, 'No se pudieron cargar los partidos. Inténtalo de nuevo.')
      return data.map(toAdminMatch)
    },

    async createMatch(seasonId, match) {
      const { data, error } = await client
        .from('matches')
        .insert({ season_id: seasonId, ...toRow(match) })
        .select('id')
        .single()
      if (error) throw readableError(error, NOT_SAVED)
      return data.id
    },

    // P0001: los triggers impiden, con su frase, lo que tocaría los votos (p. ej. reabrir la votación por la fecha).
    async updateMatch(id, match) {
      const { error } = await one(client.from('matches').update(toRow(match)), id)
      if (error) throw readableError(error, NOT_SAVED)
    },

    async deleteMatch(id) {
      const { error } = await one(client.from('matches').delete(), id)
      if (error) throw readableError(error, 'No se pudo borrar el partido. Inténtalo de nuevo.')
    },

    async getSquad(matchId) {
      const { data, error } = await client
        .from('match_squad')
        .select('player_id, minutes, yellow_card, red_card')
        .eq('match_id', matchId)
      if (error) throw readableError(error, 'No se pudo cargar la convocatoria. Inténtalo de nuevo.')
      return data.map((row) => ({ playerId: row.player_id, minutes: row.minutes, yellow: row.yellow_card, red: row.red_card }))
    },

    async getMatchEvents(matchId) {
      const [goals, missed] = await Promise.all([
        client.from('goals').select('id, scorer_id, assist_id, type').eq('match_id', matchId),
        client.from('missed_penalties').select('id, player_id, type').eq('match_id', matchId),
      ])
      const error = goals.error ?? missed.error
      if (error) throw readableError(error, 'No se pudieron cargar los goles. Inténtalo de nuevo.')
      return {
        goals: goals.data.map((g) => ({ id: g.id, scorerId: g.scorer_id, assistId: g.assist_id, type: g.type })),
        missedPenalties: missed.data.map((p) => ({ id: p.id, playerId: p.player_id, type: p.type })),
      }
    },

    // Alta o cambio de minutos y tarjetas en una sola petición. Los triggers protegen a los votados y a los goleadores.
    async saveSquad(matchId, players) {
      if (!players.length) return
      const rows = players.map((p) => ({
        match_id: matchId,
        player_id: p.playerId,
        minutes: p.minutes,
        yellow_card: p.yellow,
        red_card: p.red,
      }))
      const { error } = await client.from('match_squad').upsert(rows, { onConflict: 'match_id,player_id' })
      if (error) throw readableError(error, SQUAD_NOT_SAVED)
    },

    // Un solo delete: si el trigger rechaza a uno (votos, goles), no se quita a ninguno.
    async removeFromSquad(matchId, playerIds) {
      const { error } = await client.from('match_squad').delete().eq('match_id', matchId).in('player_id', playerIds)
      if (error) throw readableError(error, SQUAD_NOT_SAVED)
    },

    // El trigger exige goleador y asistente con minutos y no más goles que los goles a favor (P0001, con su frase).
    async addGoal(matchId, { scorerId, assistId, type }) {
      const { error } = await client
        .from('goals')
        .insert({ match_id: matchId, scorer_id: scorerId, assist_id: assistId, type })
      if (error) throw readableError(error, 'No se pudo apuntar el gol. Inténtalo de nuevo.')
    },

    async deleteGoal(id) {
      const { error } = await client.from('goals').delete().eq('id', id).select('id').single()
      if (error) throw readableError(error, 'No se pudo borrar el gol. Inténtalo de nuevo.')
    },

    async addMissedPenalty(matchId, { playerId, type }) {
      const { error } = await client.from('missed_penalties').insert({ match_id: matchId, player_id: playerId, type })
      if (error) throw readableError(error, 'No se pudo apuntar el penalti fallado. Inténtalo de nuevo.')
    },

    async setFinished(id, finished) {
      const { error } = await one(client.from('matches').update({ is_finished: finished }), id)
      if (error) {
        throw readableError(error, `No se pudo ${finished ? 'terminar' : 'reabrir'} el partido. Inténtalo de nuevo.`)
      }
    },

    async deleteMissedPenalty(id) {
      const { error } = await client.from('missed_penalties').delete().eq('id', id).select('id').single()
      if (error) throw readableError(error, 'No se pudo borrar el penalti fallado. Inténtalo de nuevo.')
    },
  }
}
