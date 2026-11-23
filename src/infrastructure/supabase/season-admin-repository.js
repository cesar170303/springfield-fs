import { readableError } from './errors'
import { toAdminSeason } from './mappers'

const toRow = ({ name, startDate, endDate }) => ({ name, start_date: startDate, end_date: endDate })

/** @returns {import('../../application/ports/admin').SeasonAdminRepository} */
export function createSupabaseSeasonAdminRepository(client) {
  const NOT_SAVED = 'No se pudo guardar la temporada. Inténtalo de nuevo.'
  const NOT_CURRENT = 'No se pudo cambiar la temporada actual. Inténtalo de nuevo.'
  // select + single: si RLS ignora el cambio no hay fila de vuelta y salta un error, en vez de darlo por guardado.
  const update = (id, row) => client.from('seasons').update(row).eq('id', id).select('id').single()

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
      const { error } = await update(id, toRow(season))
      if (error) throw readableError(error, NOT_SAVED)
    },

    // En dos pasos porque la base de datos solo admite una actual. Si falla el segundo no queda ninguna: la app abre
    // por la más reciente hasta que se vuelva a marcar.
    async setCurrentSeason(id) {
      const cleared = await client.from('seasons').update({ is_current: false }).eq('is_current', true).neq('id', id)
      if (cleared.error) throw readableError(cleared.error, NOT_CURRENT)
      const { error } = await update(id, { is_current: true })
      if (error) throw readableError(error, NOT_CURRENT)
    },
  }
}
