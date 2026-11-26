import { describe, expect, it, vi } from 'vitest'
import { createRosterAdminUseCases } from './admin-roster'

const player = (id, nickname, archived = false) => ({ id, nickname, firstName: `N${id}`, archived })
const PLAYERS = [player(1, 'Navi'), player(2, 'Checo', true), player(3, 'Dani'), player(4, 'Álvaro')]
const SEASONS = [
  { id: 2, name: '2026/27', startDate: '2026-09-01' },
  { id: 1, name: '2025/26', startDate: '2025-09-01' },
]

function setup(rosters = {}) {
  const seasonAdminRepository = {
    getSeasons: vi.fn().mockResolvedValue(SEASONS),
    getRoster: vi.fn(async (seasonId) => rosters[seasonId] ?? []),
    addToRoster: vi.fn().mockResolvedValue(),
    changeShirtNumber: vi.fn().mockResolvedValue(),
    removeFromRoster: vi.fn().mockResolvedValue(),
  }
  const playerAdminRepository = { getPlayers: vi.fn().mockResolvedValue(PLAYERS) }
  return {
    seasonAdminRepository,
    useCases: createRosterAdminUseCases({ seasonAdminRepository, playerAdminRepository }),
  }
}

describe('casos de uso de la plantilla', () => {
  it('da la plantilla por dorsal, con los datos de cada ficha, y las fichas que se pueden añadir', async () => {
    const { useCases } = setup({
      2: [
        { playerId: 3, shirtNumber: 4 },
        { playerId: 1, shirtNumber: 9 },
        { playerId: 2, shirtNumber: 7 },
      ],
    })

    const sheet = await useCases.getRosterSheet(2)

    expect(sheet.roster.map((p) => [p.shirtNumber, p.nickname])).toEqual([
      [4, 'Dani'],
      [7, 'Checo'],
      [9, 'Navi'],
    ])
    expect(sheet.available.map((p) => p.id)).toEqual([4])
    expect(sheet.copyFrom).toBeNull()
  })

  it('con la plantilla vacía, ofrece copiar la de la temporada anterior (sin archivados)', async () => {
    const { useCases } = setup({
      1: [
        { playerId: 1, shirtNumber: 9 },
        { playerId: 2, shirtNumber: 7 },
      ],
    })

    expect((await useCases.getRosterSheet(2)).copyFrom).toEqual({ seasonName: '2025/26', count: 1 })
  })

  it('no ofrece copiar si no hay temporada anterior o si su plantilla no tiene a nadie que copiar', async () => {
    expect((await setup().useCases.getRosterSheet(1)).copyFrom).toBeNull()
    expect((await setup({ 1: [{ playerId: 2, shirtNumber: 7 }] }).useCases.getRosterSheet(2)).copyFrom).toBeNull()
  })

  it('copia la plantilla anterior en una sola petición, con sus dorsales', async () => {
    const { seasonAdminRepository, useCases } = setup({
      1: [
        { playerId: 1, shirtNumber: 9 },
        { playerId: 2, shirtNumber: 7 },
        { playerId: 3, shirtNumber: 4 },
      ],
    })

    await useCases.copyRoster(2)

    expect(seasonAdminRepository.addToRoster).toHaveBeenCalledExactlyOnceWith(2, [
      { playerId: 1, shirtNumber: 9 },
      { playerId: 3, shirtNumber: 4 },
    ])
  })

  it('si no hay nada que copiar, lo explica', async () => {
    await expect(setup().useCases.copyRoster(2)).rejects.toThrow('No hay ninguna plantilla anterior que copiar.')
  })

  it('añade un jugador con su dorsal (aunque llegue como texto del formulario)', async () => {
    const { seasonAdminRepository, useCases } = setup()

    await useCases.addToRoster({ seasonId: 2, playerId: 4, shirtNumber: '7' })

    expect(seasonAdminRepository.addToRoster).toHaveBeenCalledWith(2, [{ playerId: 4, shirtNumber: 7 }])
  })

  it.each(['', '0', '100', '7.5', 'siete'])('un dorsal «%s» no vale, y no se guarda', async (shirtNumber) => {
    const { seasonAdminRepository, useCases } = setup()
    const phrase = 'El dorsal tiene que ser un número del 1 al 99.'

    await expect(useCases.addToRoster({ seasonId: 2, playerId: 4, shirtNumber })).rejects.toThrow(phrase)
    await expect(useCases.changeShirtNumber({ seasonId: 2, playerId: 4, shirtNumber })).rejects.toThrow(phrase)
    expect(seasonAdminRepository.addToRoster).not.toHaveBeenCalled()
    expect(seasonAdminRepository.changeShirtNumber).not.toHaveBeenCalled()
  })

  it('cambia el dorsal y quita de la plantilla', async () => {
    const { seasonAdminRepository, useCases } = setup()

    await useCases.changeShirtNumber({ seasonId: 2, playerId: 4, shirtNumber: '10' })
    await useCases.removeFromRoster({ seasonId: 2, playerId: 4 })

    expect(seasonAdminRepository.changeShirtNumber).toHaveBeenCalledWith(2, 4, 10)
    expect(seasonAdminRepository.removeFromRoster).toHaveBeenCalledWith(2, 4)
  })
})
