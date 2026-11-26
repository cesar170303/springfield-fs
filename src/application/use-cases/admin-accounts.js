import { displayName } from '../../domain/user'

/**
 * Casos de uso de las cuentas en el panel de admin: de momento, los votantes de cada temporada (docs/SPEC.md §12).
 * La plantilla vota siempre; aquí solo se eligen viewers (RLS rechaza a cualquier otra cuenta).
 * @param {{ accountAdminRepository: import('../ports/admin').AccountAdminRepository }} deps
 */
export function createAccountAdminUseCases({ accountAdminRepository }) {
  return {
    /** Los viewers por nombre (su correo, si no tienen) y si votan en la temporada. */
    async getSeasonVoters(seasonId) {
      const [viewers, voters] = await Promise.all([
        accountAdminRepository.getViewers(),
        accountAdminRepository.getSeasonVoters(seasonId),
      ])
      const votes = new Set(voters)
      return viewers
        .map((v) => ({ id: v.id, name: displayName(v), email: v.email, votes: votes.has(v.id) }))
        .sort((a, b) => a.name.localeCompare(b.name, 'es'))
    },

    setSeasonVoter: ({ seasonId, userId, votes }) =>
      votes
        ? accountAdminRepository.addSeasonVoter(seasonId, userId)
        : accountAdminRepository.removeSeasonVoter(seasonId, userId),
  }
}
