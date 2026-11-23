import { HAS_MATCHES, readableError } from './errors'
import { toAdminSeason } from './mappers'

const toRow = ({ name, startDate, endDate }) => ({ name, start_date: startDate, end_date: endDate })

/** @returns {import('../../application/ports/admin').SeasonAdminRepository} */
export function createSupabaseSeasonAdminRepository(client) {
  const NOT_SAVED = 'No se pudo guardar la temporada. Inténtalo de nuevo.'
  const COMPETITION_NOT_SAVED = 'No se pudo guardar la competición. Inténtalo de nuevo.'
  const NOT_CURRENT = 'No se pudo cambiar la temporada actual. Inténtalo de nuevo.'
  // select + single: si RLS ignora el cambio o el borrado no hay fila de vuelta y salta un error, en vez de darlo por guardado.
  const update = (table, id, row) => client.from(table).update(row).eq('id', id).select('id').single()
  const remove = (table, id) => client.from(table).delete().eq('id', id).select('id').single()

  return {
    async getSeasons() {
      const { data, error } = await client
        .from('seasons')
        .select('id, name, start_date, end_date, is_current')
        .order('start_date', { ascending: false })
      if (error) throw readableError(error, 'No se pudieron cargar las temporadas. Inténtalo de nuevo.')
      return data.map(toAdminSeason)
    },

    async createSeason(season) {
      const { error } = await client.from('seasons').insert(toRow(season))
      if (error) throw readableError(error, NOT_SAVED)
    },

    async updateSeason(id, season) {
      const { error } = await update('seasons', id, toRow(season))
      if (error) throw readableError(error, NOT_SAVED)
    },

    // En dos pasos porque la base de datos solo admite una actual. Si falla el segundo no queda ninguna: la app abre
    // por la más reciente hasta que se vuelva a marcar.
    async setCurrentSeason(id) {
      const cleared = await client.from('seasons').update({ is_current: false }).eq('is_current', true).neq('id', id)
      if (cleared.error) throw readableError(cleared.error, NOT_CURRENT)
      const { error } = await update('seasons', id, { is_current: true })
      if (error) throw readableError(error, NOT_CURRENT)
    },

    async deleteSeason(id) {
      const { error } = await remove('seasons', id)
      // P0001: el trigger que protege la plantilla salta antes que la clave foránea de los partidos.
      if (error?.code === 'P0001') throw new Error(HAS_MATCHES)
      if (error) throw readableError(error, 'No se pudo borrar la temporada. Inténtalo de nuevo.')
    },

    async getCompetitions() {
      const { data, error } = await client.from('competitions').select('id, name, type').order('id')
      if (error) throw readableError(error, 'No se pudieron cargar las competiciones. Inténtalo de nuevo.')
      return data
    },

    async createCompetition(competition) {
      const { error } = await client.from('competitions').insert(competition)
      if (error) throw readableError(error, COMPETITION_NOT_SAVED)
    },

    async updateCompetition(id, competition) {
      const { error } = await update('competitions', id, competition)
      if (error) throw readableError(error, COMPETITION_NOT_SAVED)
    },

    async deleteCompetition(id) {
      const { error } = await remove('competitions', id)
      if (error) throw readableError(error, 'No se pudo borrar la competición. Inténtalo de nuevo.')
    },
  }
}
