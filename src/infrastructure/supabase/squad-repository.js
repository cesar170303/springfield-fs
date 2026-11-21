import { toSeason, toSquadPlayer } from './mappers'

/** @returns {import('../../application/ports/squad').SquadRepository} */
export function createSupabaseSquadRepository(client) {
  // Las fotos son públicas por decisión del propietario (docs/SPEC.md): basta con la URL del bucket.
  const photoUrl = (path) => client.storage.from('player-photos').getPublicUrl(path).data.publicUrl

  return {
    // Los totales los calcula la RPC (regla del proyecto): aquí solo se traducen.
    async getSquadStats({ seasonId, competitionId }) {
      const { data, error } = await client.rpc('get_squad_stats', {
        p_season_id: seasonId,
        p_competition_id: competitionId,
      })
      if (error) throw new Error(`No se pudo cargar la plantilla: ${error.message}`)
      return data.map((row) => toSquadPlayer(row, photoUrl))
    },

    async getSeasons() {
      const { data, error } = await client
        .from('seasons')
        .select('id, name, is_current')
        .order('start_date', { ascending: false })
      if (error) throw new Error(`No se pudieron cargar las temporadas: ${error.message}`)
      return data.map(toSeason)
    },

    async getCompetitions() {
      const { data, error } = await client.from('competitions').select('id, name').order('id')
      if (error) throw new Error(`No se pudieron cargar las competiciones: ${error.message}`)
      return data
    },
  }
}
