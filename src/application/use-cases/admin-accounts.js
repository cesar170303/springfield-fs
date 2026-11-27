import { playerName } from '../../domain/squad'
import { displayName, isSuperadmin, roleWithoutAdmin } from '../../domain/user'

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

    /**
     * Todas las cuentas por nombre, con su ficha vinculada. `canChange`: ni la propia cuenta ni la de un superadmin se
     * tocan desde la app (§12). Los permisos reales los da RLS: solo el superadmin puede cambiar roles.
     */
    async listAccounts(currentUserId) {
      const [accounts, linked] = await Promise.all([
        accountAdminRepository.getAccounts(),
        accountAdminRepository.getLinkedPlayers(),
      ])
      const playerOf = new Map(linked.map((p) => [p.userId, playerName(p)]))
      return accounts
        .map((a) => ({
          id: a.id,
          name: displayName(a),
          email: a.email,
          role: a.role,
          player: playerOf.get(a.id) ?? null,
          canChange: !isSuperadmin(a.role) && a.id !== currentUserId,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'es'))
    },

    makeAdmin: (userId) => accountAdminRepository.setRole(userId, 'admin'),

    /** Al quitar el admin, vuelve a jugador si tiene ficha vinculada; si no, a viewer. */
    removeAdmin: ({ id, player }) =>
      accountAdminRepository.setRole(id, roleWithoutAdmin({ hasPlayer: Boolean(player) })),

    setSeasonVoter: ({ seasonId, userId, votes }) =>
      votes
        ? accountAdminRepository.addSeasonVoter(seasonId, userId)
        : accountAdminRepository.removeSeasonVoter(seasonId, userId),
  }
}
