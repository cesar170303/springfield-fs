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
    uploadPhoto: vi.fn().mockResolvedValue(),
    setPhotoPath: vi.fn().mockResolvedValue(),
    deletePhoto: vi.fn().mockResolvedValue(),
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

describe('foto de la ficha', () => {
  const photo = { blob: new Blob(['x'], { type: 'image/webp' }), extension: 'webp' }
  const order = (repo) =>
    ['uploadPhoto', 'setPhotoPath', 'deletePhoto']
      .flatMap((name) =>
        repo[name].mock.calls.map((args, i) => [repo[name].mock.invocationCallOrder[i], name, ...args]),
      )
      .sort((a, b) => a[0] - b[0])
      .map(([, ...call]) => call)

  it('sube la nueva con un nombre nuevo, la apunta en la ficha y después borra la vieja', async () => {
    vi.setSystemTime(new Date('2026-11-26T10:00:00Z'))
    const { playerAdminRepository, useCases } = setup()

    await useCases.changePhoto({ id: 3, photoPath: 'players/3-1.webp' }, photo)
    vi.useRealTimers()

    const path = `players/3-${Date.parse('2026-11-26T10:00:00Z')}.webp`
    expect(order(playerAdminRepository)).toEqual([
      ['uploadPhoto', path, photo.blob],
      ['setPhotoPath', 3, path],
      ['deletePhoto', 'players/3-1.webp'],
    ])
  })

  it('sin foto anterior, no borra nada', async () => {
    const { playerAdminRepository, useCases } = setup()

    await useCases.changePhoto({ id: 3, photoPath: null }, photo)

    expect(playerAdminRepository.deletePhoto).not.toHaveBeenCalled()
  })

  it('si no se puede subir, no toca la ficha', async () => {
    const { playerAdminRepository, useCases } = setup()
    playerAdminRepository.uploadPhoto.mockRejectedValue(new Error('No se pudo subir la foto.'))

    await expect(useCases.changePhoto({ id: 3, photoPath: 'players/3-1.webp' }, photo)).rejects.toThrow(
      'No se pudo subir la foto.',
    )
    expect(playerAdminRepository.setPhotoPath).not.toHaveBeenCalled()
    expect(playerAdminRepository.deletePhoto).not.toHaveBeenCalled()
  })

  it('si no se puede apuntar en la ficha, borra la nueva y deja la vieja', async () => {
    const { playerAdminRepository, useCases } = setup()
    playerAdminRepository.setPhotoPath.mockRejectedValue(new Error('No se pudo guardar la foto.'))

    await expect(useCases.changePhoto({ id: 3, photoPath: 'players/3-1.webp' }, photo)).rejects.toThrow(
      'No se pudo guardar la foto.',
    )
    const uploaded = playerAdminRepository.uploadPhoto.mock.calls[0][0]
    expect(playerAdminRepository.deletePhoto.mock.calls).toEqual([[uploaded]])
  })

  it('si no se puede borrar la vieja, la foto nueva queda puesta igual (sobra un archivo, no falta)', async () => {
    const { playerAdminRepository, useCases } = setup()
    playerAdminRepository.deletePhoto.mockRejectedValue(new Error('x'))

    await expect(useCases.changePhoto({ id: 3, photoPath: 'players/3-1.webp' }, photo)).resolves.toBeUndefined()
  })

  it('quitar la foto la borra de la ficha y después del almacén', async () => {
    const { playerAdminRepository, useCases } = setup()

    await useCases.removePhoto({ id: 3, photoPath: 'players/3-1.webp' })

    expect(order(playerAdminRepository)).toEqual([
      ['setPhotoPath', 3, null],
      ['deletePhoto', 'players/3-1.webp'],
    ])
  })

  it('si no se puede quitar de la ficha, no borra el archivo', async () => {
    const { playerAdminRepository, useCases } = setup()
    playerAdminRepository.setPhotoPath.mockRejectedValue(new Error('No se pudo quitar la foto.'))

    await expect(useCases.removePhoto({ id: 3, photoPath: 'players/3-1.webp' })).rejects.toThrow('No se pudo quitar')
    expect(playerAdminRepository.deletePhoto).not.toHaveBeenCalled()
  })
})
