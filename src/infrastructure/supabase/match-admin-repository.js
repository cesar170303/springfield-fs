import { readableError } from './errors'
import { toAdminMatch } from './mappers'

const COLUMNS = 'id, competition_id, round, match_date, opponent, goals_for, goals_against, is_finished'

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
  }
}
