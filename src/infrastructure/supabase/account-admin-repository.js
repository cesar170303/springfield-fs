import { readableError } from './errors'

/** @returns {import('../../application/ports/admin').AccountAdminRepository} */
export function createSupabaseAccountAdminRepository(client) {
  const NOT_LOADED = 'No se pudieron cargar los votantes. Inténtalo de nuevo.'

  return {
    // RLS: solo el staff lee los perfiles de los demás.
    async getViewers() {
      const { data, error } = await client.from('profiles').select('id, full_name, email').eq('role', 'viewer')
      if (error) throw readableError(error, NOT_LOADED)
      return data.map((row) => ({ id: row.id, fullName: row.full_name, email: row.email }))
    },

    async getSeasonVoters(seasonId) {
      const { data, error } = await client.from('season_voters').select('user_id').eq('season_id', seasonId)
      if (error) throw readableError(error, NOT_LOADED)
      return data.map((row) => row.user_id)
    },

    // `added_by` lo pone la base de datos (auth.uid()); RLS solo deja elegir a un viewer.
    async addSeasonVoter(seasonId, userId) {
      const { error } = await client.from('season_voters').insert({ season_id: seasonId, user_id: userId })
      if (error) throw readableError(error, 'No se pudo guardar el votante. Inténtalo de nuevo.')
    },

    async removeSeasonVoter(seasonId, userId) {
      const { error } = await client
        .from('season_voters')
        .delete()
        .eq('season_id', seasonId)
        .eq('user_id', userId)
        .select('user_id')
        .single()
      if (error) throw readableError(error, 'No se pudo quitar el votante. Inténtalo de nuevo.')
    },
  }
}
