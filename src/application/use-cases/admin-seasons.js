/**
 * Casos de uso de las temporadas y las competiciones en el panel de admin.
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

    listCompetitions: () => seasonAdminRepository.getCompetitions(),

    /** Sin `id`, crea la competición; con `id`, la edita. */
    async saveCompetition({ id, name, type }) {
      const data = { name: name.trim(), type }
      if (!data.name) throw new Error('Pon un nombre a la competición.')
      if (id) await seasonAdminRepository.updateCompetition(id, data)
      else await seasonAdminRepository.createCompetition(data)
    },
  }
}
