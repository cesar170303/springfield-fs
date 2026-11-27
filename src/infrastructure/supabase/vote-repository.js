import { readableError } from './errors'
import { toOpenVote } from './mappers'

/** @returns {import('../../application/ports/vote').VoteRepository} */
export function createSupabaseVoteRepository(client) {
  const photoUrl = (path) => client.storage.from('player-photos').getPublicUrl(path).data.publicUrl

  return {
    // Las notas propias llegan con la RPC: el frontend nunca lee la tabla votes (anonimato, CLAUDE.md).
    async getMyOpenVotes() {
      const { data, error } = await client.rpc('get_my_open_votes')
      if (error) throw new Error(`No se pudo cargar la votación: ${error.message}`)
      return data.map((row) => toOpenVote(row, photoUrl))
    },

    // Sin voter_id: lo pone la base de datos (auth.uid()) y RLS (rls.can_vote) decide si vale.
    async castVote({ matchId, playerId, score }) {
      const { error } = await client.from('votes').insert({ match_id: matchId, rated_id: playerId, score })
      if (!error) return
      // 42501: RLS lo rechaza; con la pantalla al día, casi siempre porque la votación acaba de cerrarse.
      if (error.code === '42501') throw new Error('La votación de este partido ya está cerrada.')
      throw readableError(error, 'No se pudo guardar tu nota. Vuelve a intentarlo.')
    },
  }
}
