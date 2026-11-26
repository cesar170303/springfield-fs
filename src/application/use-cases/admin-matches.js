import { canHaveResult, canLeaveSquad, matchLabel } from '../../domain/match'
import { playerName } from '../../domain/squad'

const isBlank = (value) => String(value ?? '').trim() === ''

/** Un número entero de un campo del formulario (llega como texto), o null si no es un entero. */
function integer(value) {
  const number = Number(value)
  return !isBlank(value) && Number.isInteger(number) ? number : null
}

/** El resultado: los dos goles o ninguno (un partido por jugar no tiene resultado). */
function score(goalsFor, goalsAgainst) {
  if (isBlank(goalsFor) && isBlank(goalsAgainst)) return { goalsFor: null, goalsAgainst: null }
  if (isBlank(goalsFor) || isBlank(goalsAgainst)) throw new Error('Pon los dos goles del resultado, o ninguno.')
  const result = { goalsFor: integer(goalsFor), goalsAgainst: integer(goalsAgainst) }
  if (!(result.goalsFor >= 0 && result.goalsAgainst >= 0)) {
    throw new Error('Los goles tienen que ser un número, 0 o más.')
  }
  return result
}

/** Minutos jugados: de 0 a 40 (dos partes de 20, sin prórroga). Vacío cuenta como 0. */
function minutes(value) {
  const number = isBlank(value) ? 0 : integer(value)
  if (number === null || number < 0 || number > 40) throw new Error('Los minutos van de 0 a 40 (dos partes de 20).')
  return number
}

/**
 * Casos de uso de los partidos en el panel de admin (docs/SPEC.md §12).
 * @param {{ matchAdminRepository: import('../ports/admin').MatchAdminRepository,
 *   seasonAdminRepository: import('../ports/admin').SeasonAdminRepository,
 *   playerAdminRepository: import('../ports/admin').PlayerAdminRepository }} deps
 */
export function createMatchAdminUseCases({ matchAdminRepository, seasonAdminRepository, playerAdminRepository }) {
  return {
    /** Partidos de la temporada, del más reciente al más antiguo, con su competición y su etiqueta (J5, Copa J2). */
    async listMatches(seasonId) {
      const [matches, competitions] = await Promise.all([
        matchAdminRepository.getMatches(seasonId),
        seasonAdminRepository.getCompetitions(),
      ])
      const byId = new Map(competitions.map((c) => [c.id, c]))
      return {
        competitions,
        matches: matches
          .map((m) => {
            const competition = byId.get(m.competitionId)
            return { ...m, competition, label: matchLabel(competition?.type, m.round) }
          })
          .sort((a, b) => b.date - a.date),
      }
    },

    /** Sin `id`, crea el partido en `seasonId`; con `id`, lo edita. Devuelve el id del partido. */
    async saveMatch({ id, seasonId, competitionId, round, date, opponent, goalsFor, goalsAgainst }) {
      const data = {
        competitionId,
        round: integer(round),
        date,
        opponent: opponent.trim(),
        ...score(goalsFor, goalsAgainst),
      }
      if (!data.opponent) throw new Error('Pon el nombre del rival.')
      if (!(data.round >= 1)) throw new Error('La jornada tiene que ser un número mayor que 0.')
      if (!(date instanceof Date) || Number.isNaN(date.getTime()))
        throw new Error('Pon la fecha y la hora del partido.')
      if (data.goalsFor !== null && !canHaveResult(date)) {
        throw new Error('Un partido que aún no se ha jugado no puede tener resultado.')
      }
      if (!id) return matchAdminRepository.createMatch(seasonId, data)
      await matchAdminRepository.updateMatch(id, data)
      return id
    },

    /** Solo sin votos: con votos lo impide la base de datos, con su frase. */
    deleteMatch: (id) => matchAdminRepository.deleteMatch(id),

    /**
     * La plantilla de la temporada, por dorsal, con la convocatoria del partido: si está convocado, minutos, tarjetas
     * y si se puede quitar (no, si tiene goles, asistencias o penaltis apuntados).
     */
    async getMatchSquad({ matchId, seasonId }) {
      const [roster, players, squad, events] = await Promise.all([
        seasonAdminRepository.getRoster(seasonId),
        playerAdminRepository.getPlayers(),
        matchAdminRepository.getSquad(matchId),
        matchAdminRepository.getMatchEvents(matchId),
      ])
      const playerById = new Map(players.map((p) => [p.id, p]))
      const calledById = new Map(squad.map((s) => [s.playerId, s]))
      return roster
        .map(({ playerId, shirtNumber }) => {
          const called = calledById.get(playerId)
          return {
            playerId,
            name: playerName(playerById.get(playerId)),
            shirtNumber,
            called: Boolean(called),
            minutes: called?.minutes ?? 0,
            yellow: called?.yellow ?? false,
            red: called?.red ?? false,
            canLeave: canLeaveSquad(playerId, events),
          }
        })
        .sort((a, b) => a.shirtNumber - b.shirtNumber)
    },

    /**
     * Guarda la convocatoria en el orden que no pierde datos si falla a medias: primero los convocados (alta o cambio
     * de minutos y tarjetas) y después quita a los que ya no lo están. Lo que proteja la base de datos (votos, goles)
     * llega con su frase.
     */
    async saveMatchSquad({ matchId, squad }) {
      const called = squad
        .filter((p) => p.called)
        .map((p) => ({ playerId: p.playerId, minutes: minutes(p.minutes), yellow: p.yellow, red: p.red }))
      const removed = squad.filter((p) => !p.called).map((p) => p.playerId)
      await matchAdminRepository.saveSquad(matchId, called)
      if (removed.length) await matchAdminRepository.removeFromSquad(matchId, removed)
    },
  }
}
