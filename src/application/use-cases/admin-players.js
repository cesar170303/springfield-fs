import { playerName } from '../../domain/squad'

const byName = (a, b) => playerName(a).localeCompare(playerName(b), 'es')

/**
 * Casos de uso de las fichas de jugadores en el panel de admin (docs/SPEC.md §12).
 * @param {{ playerAdminRepository: import('../ports/admin').PlayerAdminRepository }} deps
 */
export function createPlayerAdminUseCases({ playerAdminRepository }) {
  return {
    listPlayers: async () => (await playerAdminRepository.getPlayers()).sort(byName),

    /** Sin `id`, crea la ficha; con `id`, la edita. Devuelve el id de la ficha. */
    async savePlayer({ id, firstName, lastName, nickname, email, position, status }) {
      const data = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        nickname: nickname.trim() || null,
        // En minúsculas: así lo guarda la BD, y así se compara al vincular la cuenta.
        email: email.trim().toLowerCase() || null,
        position,
        status,
      }
      if (!data.firstName) throw new Error('Pon el nombre del jugador.')
      if (!data.lastName) throw new Error('Pon los apellidos del jugador.')
      if (!id) return playerAdminRepository.createPlayer(data)
      await playerAdminRepository.updatePlayer(id, data)
      return id
    },

    archivePlayer: (id) => playerAdminRepository.setArchived(id, true),

    restorePlayer: (id) => playerAdminRepository.setArchived(id, false),
  }
}
