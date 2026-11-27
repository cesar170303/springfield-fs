import { groupVoteMatches, isValidScore } from '../../domain/vote'

/**
 * Casos de uso de la votación.
 * @param {{ voteRepository: import('../ports/vote').VoteRepository, random?: () => number }} deps
 */
export function createVoteUseCases({ voteRepository, random = Math.random }) {
  return {
    /** Partidos con algún compañero pendiente, del que cierra antes al último, con los pendientes barajados. */
    async getVoteSession() {
      const matches = groupVoteMatches(await voteRepository.getMyOpenVotes(), random)
      return matches.filter((match) => match.pending.length > 0)
    },

    /** Guarda un voto. Es definitivo: la cuenta atrás para deshacer la lleva la pantalla, antes de llamar aquí. */
    async castVote({ matchId, playerId, score }) {
      if (!isValidScore(score)) throw new Error('Elige una nota de 1 a 10 antes de votar.')
      await voteRepository.castVote({ matchId, playerId, score })
    },
  }
}
