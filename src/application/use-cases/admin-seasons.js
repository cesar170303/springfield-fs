/**
 * Casos de uso de las temporadas en el panel de admin.
 * @param {{ seasonAdminRepository: import('../ports/admin').SeasonAdminRepository }} deps
 */
export function createSeasonAdminUseCases({ seasonAdminRepository }) {
  return {
    listSeasons: () => seasonAdminRepository.getSeasons(),

    /** Sin `id`, crea la temporada; con `id`, la edita. */
    async saveSeason({ id, ...season }) {
      const data = { ...season, name: season.name.trim() }
      if (!data.name) throw new Error('Pon un nombre a la temporada.')
      if (id) await seasonAdminRepository.updateSeason(id, data)
      else await seasonAdminRepository.createSeason(data)
    },

    setCurrentSeason: (id) => seasonAdminRepository.setCurrentSeason(id),
  }
}
