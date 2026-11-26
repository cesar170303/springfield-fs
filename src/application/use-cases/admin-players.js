import { playerName } from '../../domain/squad'

const byName = (a, b) => playerName(a).localeCompare(playerName(b), 'es')

/**
 * Casos de uso de las fichas de jugadores en el panel de admin (docs/SPEC.md §12).
 * @param {{ playerAdminRepository: import('../ports/admin').PlayerAdminRepository }} deps
 */
export function createPlayerAdminUseCases({ playerAdminRepository }) {
  // Si el archivo viejo no se puede borrar, la ficha ya está bien: sobra un archivo, no falta ninguno.
  const deleteQuietly = (path) => playerAdminRepository.deletePhoto(path).catch(() => {})

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

    /**
     * Pone la foto (ya recortada, ver squarePhoto) en el orden que no deja la ficha apuntando a un archivo inexistente:
     * subir la nueva → apuntarla en la ficha → borrar la vieja. El nombre es nuevo cada vez para que la caché del
     * navegador no siga enseñando la anterior.
     */
    async changePhoto({ id, photoPath }, { blob, extension }) {
      const path = `players/${id}-${Date.now()}.${extension}`
      await playerAdminRepository.uploadPhoto(path, blob)
      try {
        await playerAdminRepository.setPhotoPath(id, path)
      } catch (error) {
        await deleteQuietly(path)
        throw error
      }
      if (photoPath) await deleteQuietly(photoPath)
    },

    /** Quita la foto de la ficha y, después, borra el archivo. */
    async removePhoto({ id, photoPath }) {
      await playerAdminRepository.setPhotoPath(id, null)
      await deleteQuietly(photoPath)
    },
  }
}
