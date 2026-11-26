import { playersToAdd, previousSeason, rosterToCopy } from '../../domain/roster'

/** El dorsal llega del formulario como texto: un entero del 1 al 99 o un error con su frase. */
function shirt(value) {
  const number = Number(value)
  if (String(value).trim() === '' || !Number.isInteger(number) || number < 1 || number > 99) {
    throw new Error('El dorsal tiene que ser un número del 1 al 99.')
  }
  return number
}

/**
 * Casos de uso de la plantilla y los dorsales de cada temporada (docs/SPEC.md §12).
 * @param {{ seasonAdminRepository: import('../ports/admin').SeasonAdminRepository,
 *   playerAdminRepository: import('../ports/admin').PlayerAdminRepository }} deps
 */
export function createRosterAdminUseCases({ seasonAdminRepository, playerAdminRepository }) {
  /** Lo que se copiaría de la temporada anterior a `seasonId`, con su nombre (null si no hay nada). */
  async function copyCandidate(seasonId, seasons, players) {
    const previous = previousSeason(seasons, seasonId)
    if (!previous) return null
    const entries = rosterToCopy(await seasonAdminRepository.getRoster(previous.id), players)
    return entries.length ? { season: previous, entries } : null
  }

  return {
    /** Plantilla por dorsal (con los datos de cada ficha), fichas que se pueden añadir y, si está vacía, qué copiar. */
    async getRosterSheet(seasonId) {
      const [seasons, players, entries] = await Promise.all([
        seasonAdminRepository.getSeasons(),
        playerAdminRepository.getPlayers(),
        seasonAdminRepository.getRoster(seasonId),
      ])
      const byId = new Map(players.map((p) => [p.id, p]))
      const roster = entries
        .map((e) => ({ ...byId.get(e.playerId), shirtNumber: e.shirtNumber }))
        .sort((a, b) => a.shirtNumber - b.shirtNumber)
      const candidate = entries.length ? null : await copyCandidate(seasonId, seasons, players)
      return {
        roster,
        available: playersToAdd(players, entries),
        copyFrom: candidate && { seasonName: candidate.season.name, count: candidate.entries.length },
      }
    },

    /** Copia la plantilla anterior en una sola petición: entran todos o ninguno. */
    async copyRoster(seasonId) {
      const [seasons, players] = await Promise.all([
        seasonAdminRepository.getSeasons(),
        playerAdminRepository.getPlayers(),
      ])
      const candidate = await copyCandidate(seasonId, seasons, players)
      if (!candidate) throw new Error('No hay ninguna plantilla anterior que copiar.')
      await seasonAdminRepository.addToRoster(seasonId, candidate.entries)
    },

    addToRoster: async ({ seasonId, playerId, shirtNumber }) =>
      seasonAdminRepository.addToRoster(seasonId, [{ playerId, shirtNumber: shirt(shirtNumber) }]),

    changeShirtNumber: async ({ seasonId, playerId, shirtNumber }) =>
      seasonAdminRepository.changeShirtNumber(seasonId, playerId, shirt(shirtNumber)),

    /** Si ya fue convocado esa temporada, la base de datos lo impide con su frase. */
    removeFromRoster: ({ seasonId, playerId }) => seasonAdminRepository.removeFromRoster(seasonId, playerId),
  }
}
