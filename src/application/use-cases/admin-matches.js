import { canHaveResult, canLeaveSquad, goalDetail, matchLabel, scorerOptions } from '../../domain/match'
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
  /** La plantilla de la temporada con la convocatoria del partido, y sus goles y penaltis fallados. */
  async function loadSquad({ matchId, seasonId }) {
    const [roster, players, called, events] = await Promise.all([
      seasonAdminRepository.getRoster(seasonId),
      playerAdminRepository.getPlayers(),
      matchAdminRepository.getSquad(matchId),
      matchAdminRepository.getMatchEvents(matchId),
    ])
    const playerById = new Map(players.map((p) => [p.id, p]))
    const calledById = new Map(called.map((s) => [s.playerId, s]))
    const squad = roster
      .map(({ playerId, shirtNumber }) => {
        const entry = calledById.get(playerId)
        return {
          playerId,
          name: playerName(playerById.get(playerId)),
          shirtNumber,
          called: Boolean(entry),
          minutes: entry?.minutes ?? 0,
          yellow: entry?.yellow ?? false,
          red: entry?.red ?? false,
          canLeave: canLeaveSquad(playerId, events),
        }
      })
      .sort((a, b) => a.shirtNumber - b.shirtNumber)
    return { squad, events }
  }

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
    getMatchSquad: async (ids) => (await loadSquad(ids)).squad,

    /** Para «Goles» y «Penaltis fallados»: quién puede marcar (convocados con minutos) y lo ya apuntado. */
    async getMatchGoals(ids) {
      const { squad, events } = await loadSquad(ids)
      const nameOf = (id) => squad.find((p) => p.playerId === id)?.name
      return {
        players: scorerOptions(squad).map(({ playerId, name }) => ({ playerId, name })),
        goals: events.goals.map((g) => ({
          id: g.id,
          scorerId: g.scorerId,
          scorer: nameOf(g.scorerId),
          detail: goalDetail(g, nameOf),
        })),
        missedPenalties: events.missedPenalties.map((p) => ({
          id: p.id,
          player: nameOf(p.playerId),
          detail: goalDetail({ type: p.type }, nameOf),
        })),
      }
    },

    /** Más goles que los goles a favor, o un goleador sin minutos, lo impide la base de datos con su frase. */
    async addGoal({ matchId, scorerId, assistId, type }) {
      if (!scorerId) throw new Error('Elige quién marcó.')
      // Un penalti nunca lleva asistente (la base de datos tampoco lo deja).
      await matchAdminRepository.addGoal(matchId, { scorerId, assistId: type === 'regular' ? assistId : null, type })
    },

    deleteGoal: (id) => matchAdminRepository.deleteGoal(id),

    async addMissedPenalty({ matchId, playerId, type }) {
      if (!playerId) throw new Error('Elige quién falló el penalti.')
      await matchAdminRepository.addMissedPenalty(matchId, { playerId, type })
    },

    deleteMissedPenalty: (id) => matchAdminRepository.deleteMissedPenalty(id),

    /** Terminar abre la votación (7 días desde el partido). Sin resultado o con fecha futura, la base de datos lo impide. */
    finishMatch: (id) => matchAdminRepository.setFinished(id, true),

    /** Solo si nadie ha votado: con votos, la base de datos lo impide con su frase. */
    reopenMatch: (id) => matchAdminRepository.setFinished(id, false),

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
