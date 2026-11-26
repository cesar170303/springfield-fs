import { readableError } from './errors'
import { toAdminPlayer } from './mappers'

// Nunca `email` ni `*`: el correo no es legible en `players` (permisos por columna) y la consulta entera fallaría.
const COLUMNS = 'id, first_name, last_name, nickname, user_id, position, status, photo_path, archived_at'

const toRow = ({ firstName, lastName, nickname, email, position, status }) => ({
  first_name: firstName,
  last_name: lastName,
  nickname,
  email,
  position,
  status,
})

/** @returns {import('../../application/ports/admin').PlayerAdminRepository} */
export function createSupabasePlayerAdminRepository(client) {
  const NOT_SAVED = 'No se pudo guardar la ficha. Inténtalo de nuevo.'
  const photoUrl = (path) => client.storage.from('player-photos').getPublicUrl(path).data.publicUrl
  // select + single: si RLS ignora el cambio no hay fila de vuelta y salta un error, en vez de darlo por guardado.
  const update = (id, row) => client.from('players').update(row).eq('id', id).select('id').single()

  return {
    async getPlayers() {
      const [players, emails] = await Promise.all([
        client.from('players').select(COLUMNS),
        client.rpc('get_player_emails'), // solo el staff: a los demás, 42501
      ])
      const error = players.error ?? emails.error
      if (error) throw readableError(error, 'No se pudieron cargar los jugadores. Inténtalo de nuevo.')
      const emailOf = new Map(emails.data.map((row) => [row.player_id, row.email]))
      return players.data.map((row) => toAdminPlayer(row, emailOf.get(row.id) ?? null, photoUrl))
    },

    async createPlayer(player) {
      const { data, error } = await client.from('players').insert(toRow(player)).select('id').single()
      if (error) throw readableError(error, NOT_SAVED)
      return data.id
    },

    async updatePlayer(id, player) {
      const { error } = await update(id, toRow(player))
      if (error) throw readableError(error, NOT_SAVED)
    },

    async setArchived(id, archived) {
      const { error } = await update(id, { archived_at: archived ? new Date().toISOString() : null })
      if (error) {
        throw readableError(error, `No se pudo ${archived ? 'archivar' : 'recuperar'} la ficha. Inténtalo de nuevo.`)
      }
    },
  }
}
