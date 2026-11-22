/**
 * Casos de uso de la ficha del jugador.
 * @param {{
 *   squadRepository: import('../ports/squad').SquadRepository,
 *   playerRepository: import('../ports/player').PlayerRepository
 * }} deps
 */
export function createPlayerUseCases({ squadRepository, playerRepository }) {
  return {
    /**
     * Todo lo que enseña la ficha: los totales del jugador (los de la plantilla, calculados por la RPC), su gráfica y
     * sus partidos. `player` es null si no está en la plantilla de esa temporada.
     * La gráfica es de todas las competiciones: get_player_rating_timeline no filtra por competición.
     */
    async getPlayerSheet({ playerId, seasonId, competitionId }) {
      const [squad, timeline, matches] = await Promise.all([
        squadRepository.getSquadStats({ seasonId, competitionId }),
        playerRepository.getRatingTimeline({ playerId, seasonId }),
        playerRepository.getMatchLog({ playerId, seasonId, competitionId }),
      ])
      return { player: squad.find((p) => p.id === playerId) ?? null, timeline, matches }
    },
  }
}
