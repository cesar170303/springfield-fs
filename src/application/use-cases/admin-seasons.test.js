import { describe, expect, it, vi } from 'vitest'
import { createSeasonAdminUseCases } from './admin-seasons'

const DATA = { name: '2027/28', startDate: '2027-09-01', endDate: '2028-06-30' }

function setup() {
  const seasonAdminRepository = {
    getSeasons: vi.fn().mockResolvedValue([{ id: 2 }]),
    createSeason: vi.fn().mockResolvedValue(),
    updateSeason: vi.fn().mockResolvedValue(),
    setCurrentSeason: vi.fn().mockResolvedValue(),
    getCompetitions: vi.fn().mockResolvedValue([{ id: 1 }]),
    createCompetition: vi.fn().mockResolvedValue(),
    updateCompetition: vi.fn().mockResolvedValue(),
  }
  return { seasonAdminRepository, useCases: createSeasonAdminUseCases({ seasonAdminRepository }) }
}

describe('casos de uso de temporadas', () => {
  it('lista las temporadas y marca la actual', async () => {
    const { seasonAdminRepository, useCases } = setup()

    expect(await useCases.listSeasons()).toEqual([{ id: 2 }])
    await useCases.setCurrentSeason(2)
    expect(seasonAdminRepository.setCurrentSeason).toHaveBeenCalledWith(2)
  })

  it('sin id, crea la temporada (con el nombre sin espacios de más)', async () => {
    const { seasonAdminRepository, useCases } = setup()

    await useCases.saveSeason({ ...DATA, name: ' 2027/28 ' })

    expect(seasonAdminRepository.createSeason).toHaveBeenCalledWith(DATA)
    expect(seasonAdminRepository.updateSeason).not.toHaveBeenCalled()
  })

  it('con id, la edita', async () => {
    const { seasonAdminRepository, useCases } = setup()

    await useCases.saveSeason({ id: 2, ...DATA })

    expect(seasonAdminRepository.updateSeason).toHaveBeenCalledWith(2, DATA)
    expect(seasonAdminRepository.createSeason).not.toHaveBeenCalled()
  })

  it('un nombre en blanco no se guarda', async () => {
    const { seasonAdminRepository, useCases } = setup()

    await expect(useCases.saveSeason({ ...DATA, name: '  ' })).rejects.toThrow('Pon un nombre a la temporada.')
    expect(seasonAdminRepository.createSeason).not.toHaveBeenCalled()
  })
})

describe('casos de uso de competiciones', () => {
  it('lista, crea (con el nombre sin espacios de más) y edita', async () => {
    const { seasonAdminRepository, useCases } = setup()

    expect(await useCases.listCompetitions()).toEqual([{ id: 1 }])
    await useCases.saveCompetition({ name: ' Amistosos ', type: 'friendly' })
    await useCases.saveCompetition({ id: 2, name: 'Copa', type: 'cup' })

    expect(seasonAdminRepository.createCompetition).toHaveBeenCalledExactlyOnceWith({
      name: 'Amistosos',
      type: 'friendly',
    })
    expect(seasonAdminRepository.updateCompetition).toHaveBeenCalledExactlyOnceWith(2, { name: 'Copa', type: 'cup' })
  })

  it('un nombre en blanco no se guarda', async () => {
    const { seasonAdminRepository, useCases } = setup()

    await expect(useCases.saveCompetition({ name: ' ', type: 'cup' })).rejects.toThrow(
      'Pon un nombre a la competición.',
    )
    expect(seasonAdminRepository.createCompetition).not.toHaveBeenCalled()
  })
})
