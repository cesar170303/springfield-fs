import { toProfile } from './mappers'

/** @returns {import('../../application/ports/auth').ProfileRepository} */
export function createSupabaseProfileRepository(client) {
  return {
    // RLS solo deja leer el perfil propio (o todos si eres staff).
    async getById(userId) {
      const { data } = await client.from('profiles').select('id, email, full_name, role').eq('id', userId).single()
      return toProfile(data)
    },
  }
}
