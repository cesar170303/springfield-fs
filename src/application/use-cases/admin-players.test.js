import { describe, expect, it, vi } from 'vitest'
import { createPlayerAdminUseCases } from './admin-players'

const player = (id, firstName, nickname = null) => ({ id, firstName, lastName: 'Ejemplo', nickname })
const DATA = {
  firstName: '  Sergio ',
  lastName: ' López ',
  nickname: ' Checo ',
  email: ' Sergio@Example.com ',
  position: 'winger',
  status: 'injured',
}

function setup() {
  const playerAdminRepository = {
    getPlayers: vi
      .fn()
      .mockResolvedValue([player(1, 'Sergio', 'Checo'), player(2, 'Álvaro'), player(3, 'Daniel', 'Dani')]),
    createPlayer: vi.fn().mockResolvedValue(9),
    updatePlayer: vi.fn().mockResolvedValue(),
    setArchived: vi.fn().mockResolvedValue(),
  }
  return { playerAdminRepository, useCases: createPlayerAdminUseCases({ playerAdminRepository }) }
}

describe('casos de uso de las fichas de jugadores', () => {
  it('lista las fichas por el nombre que se ve (el apodo, o el nombre si no tiene)', async () => {
    const { useCases } = setup()

    expect((await useCases.listPlayers()).map((p) => p.id)).toEqual([2, 1, 3]) // Álvaro, Checo, Dani
  })

  it('sin id, crea la ficha sin espacios de más y con el correo en minúsculas, y da su id', async () => {
    const { playerAdminRepository, useCases } = setup()

    expect(await useCases.savePlayer(DATA)).toBe(9)
    expect(playerAdminRepository.createPlayer).toHaveBeenCalledWith({
      firstName: 'Sergio',
      lastName: 'López',
      nickname: 'Checo',
      email: 'sergio@example.com',
      position: 'winger',
      status: 'injured',
    })
  })

  it('con id, edita la ficha; el apodo y el correo vacíos se guardan como «sin apodo» y «sin correo»', async () => {
    const { playerAdminRepository, useCases } = setup()

    expect(await useCases.savePlayer({ ...DATA, id: 4, nickname: ' ', email: '' })).toBe(4)
    expect(playerAdminRepository.updatePlayer).toHaveBeenCalledWith(
      4,
      expect.objectContaining({ nickname: null, email: null }),
    )
  })

  it.each([
    ['firstName', 'Pon el nombre del jugador.'],
    ['lastName', 'Pon los apellidos del jugador.'],
  ])('sin %s, no guarda y lo explica', async (key, phrase) => {
    const { playerAdminRepository, useCases } = setup()

    await expect(useCases.savePlayer({ ...DATA, [key]: '  ' })).rejects.toThrow(phrase)
    expect(playerAdminRepository.createPlayer).not.toHaveBeenCalled()
  })

  it('archiva y recupera una ficha', async () => {
    const { playerAdminRepository, useCases } = setup()

    await useCases.archivePlayer(4)
    await useCases.restorePlayer(4)

    expect(playerAdminRepository.setArchived.mock.calls).toEqual([
      [4, true],
      [4, false],
    ])
  })
})
