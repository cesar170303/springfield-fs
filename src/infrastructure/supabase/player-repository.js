import { toMatchLogEntry, toRatingPoint } from './mappers'

/** @returns {import('../../application/ports/player').PlayerRepository} */
export function createSupabasePlayerRepository(client) {
  return {
    // La nota, la media acumulada y la del equipo las calcula la RPC, solo con votaciones cerradas.
    async getRatingTimeline({ playerId, seasonId }) {
      const { data, error } = await client.rpc('get_player_rating_timeline', {
        p_player_id: playerId,
        p_season_id: seasonId,
      })
      if (error) throw new Error(`No se pudo cargar la gráfica del jugador: ${error.message}`)
      return data.map(toRatingPoint)
    },

    async getMatchLog({ playerId, seasonId, competitionId }) {
      const { data, error } = await client.rpc('get_player_match_log', {
        p_player_id: playerId,
        p_season_id: seasonId,
        p_competition_id: competitionId,
      })
      if (error) throw new Error(`No se pudieron cargar los partidos del jugador: ${error.message}`)
      return data.map(toMatchLogEntry)
    },
  }
}
