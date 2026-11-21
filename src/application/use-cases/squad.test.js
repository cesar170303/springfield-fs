import { describe, expect, it, vi } from 'vitest'
import { createSquadUseCases } from './squad'

function fakeRepository(seasons) {
  return {
    getSeasons: vi.fn().mockResolvedValue(seasons),
    getCompetitions: vi.fn().mockResolvedValue([{ id: 1, name: 'Liga' }]),
    getSquadStats: vi.fn().mockResolvedValue([{ id: 7, name: 'Chino' }]),
  }
}

describe('createSquadUseCases', () => {
  it('ofrece temporadas y competiciones y empieza por la temporada actual', async () => {
    const seasons = [
      { id: 3, name: '2027/28', isCurrent: false },
      { id: 2, name: '2026/27', isCurrent: true },
    ]
    const { getSquadFilters } = createSquadUseCases({ squadRepository: fakeRepository(seasons) })

    expect(await getSquadFilters()).toEqual({
      seasons,
      competitions: [{ id: 1, name: 'Liga' }],
      initialSeasonId: 2,
    })
  })

  it('si ninguna está marcada como actual, empieza por la más reciente', async () => {
    const seasons = [
      { id: 3, name: '2027/28', isCurrent: false },
      { id: 2, name: '2026/27', isCurrent: false },
    ]
    const { getSquadFilters } = createSquadUseCases({ squadRepository: fakeRepository(seasons) })

    expect((await getSquadFilters()).initialSeasonId).toBe(3)
  })

  it('sin temporadas no hay ninguna que mostrar', async () => {
    const { getSquadFilters } = createSquadUseCases({ squadRepository: fakeRepository([]) })

    expect((await getSquadFilters()).initialSeasonId).toBeNull()
  })

  it('pide las estadísticas de la temporada y competición elegidas', async () => {
    const squadRepository = fakeRepository([])
    const { getSquadStats } = createSquadUseCases({ squadRepository })

    expect(await getSquadStats({ seasonId: 2, competitionId: null })).toEqual([{ id: 7, name: 'Chino' }])
    expect(squadRepository.getSquadStats).toHaveBeenCalledWith({ seasonId: 2, competitionId: null })
  })
})
