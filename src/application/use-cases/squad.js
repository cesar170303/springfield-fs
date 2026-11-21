/**
 * Casos de uso de la pantalla de la plantilla.
 * @param {{ squadRepository: import('../ports/squad').SquadRepository }} deps
 */
export function createSquadUseCases({ squadRepository }) {
  return {
    /** Temporadas y competiciones para los selectores, y la temporada con la que se abre la pantalla. */
    async getSquadFilters() {
      const [seasons, competitions] = await Promise.all([
        squadRepository.getSeasons(),
        squadRepository.getCompetitions(),
      ])
      // La marcada como actual o, si no hay, la más reciente (el repositorio las da de nueva a antigua).
      const initial = seasons.find((s) => s.isCurrent) ?? seasons[0]
      return { seasons, competitions, initialSeasonId: initial?.id ?? null }
    },

    getSquadStats: (filters) => squadRepository.getSquadStats(filters),
  }
}
