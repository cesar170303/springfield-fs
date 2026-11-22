import { describe, expect, it, vi } from 'vitest'
import { createPlayerUseCases } from './player'

const chino = { id: 3, name: 'Chino', goals: 11 }
const rulo = { id: 2, name: 'Rulo', goals: 4 }
const timeline = [{ matchId: 1, label: 'J1', opponent: 'Rival', rating: 8, cumulativeAvg: 8, teamAvg: 7 }]
const matches = [{ matchId: 1, label: 'J1', opponent: 'Rival', minutes: 40 }]

// Fakes de los ports: devuelven datos fijos y espían qué se les pide.
function setup() {
  const squadRepository = { getSquadStats: vi.fn().mockResolvedValue([rulo, chino]) }
  const playerRepository = {
    getRatingTimeline: vi.fn().mockResolvedValue(timeline),
    getMatchLog: vi.fn().mockResolvedValue(matches),
  }
  return { squadRepository, playerRepository, useCases: createPlayerUseCases({ squadRepository, playerRepository }) }
}

describe('casos de uso de la ficha del jugador', () => {
  it('reúne sus totales de la plantilla, su gráfica y sus partidos, con la temporada y la competición pedidas', async () => {
    const { useCases, squadRepository, playerRepository } = setup()

    const sheet = await useCases.getPlayerSheet({ playerId: 3, seasonId: 2, competitionId: 1 })

    expect(sheet).toEqual({ player: chino, timeline, matches })
    expect(squadRepository.getSquadStats).toHaveBeenCalledWith({ seasonId: 2, competitionId: 1 })
    expect(playerRepository.getRatingTimeline).toHaveBeenCalledWith({ playerId: 3, seasonId: 2 })
    expect(playerRepository.getMatchLog).toHaveBeenCalledWith({ playerId: 3, seasonId: 2, competitionId: 1 })
  })

  it('si el jugador no está en la plantilla de esa temporada, lo dice con player null', async () => {
    const { useCases } = setup()

    const sheet = await useCases.getPlayerSheet({ playerId: 99, seasonId: 2, competitionId: null })

    expect(sheet.player).toBeNull()
  })

  it('si falla una de las cargas, el error llega a la pantalla', async () => {
    const { useCases, playerRepository } = setup()
    playerRepository.getMatchLog.mockRejectedValue(new Error('No se pudieron cargar los partidos del jugador: x'))

    await expect(useCases.getPlayerSheet({ playerId: 3, seasonId: 2, competitionId: null })).rejects.toThrow(
      'No se pudieron cargar los partidos del jugador',
    )
  })
})
