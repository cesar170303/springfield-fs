import { describe, expect, it, vi } from 'vitest'
import { createMatchAdminUseCases } from './admin-matches'

const COMPETITIONS = [
  { id: 1, name: 'Liga', type: 'league' },
  { id: 2, name: 'Copa local', type: 'cup' },
]
const match = (id, competitionId, round, date, extra = {}) => ({
  id,
  competitionId,
  round,
  date: new Date(date),
  opponent: `Rival ${id}`,
  goalsFor: null,
  goalsAgainst: null,
  isFinished: false,
  ...extra,
})
const DATA = {
  seasonId: 2,
  competitionId: 1,
  round: '7',
  date: new Date('2026-11-29T17:30:00Z'),
  opponent: '  CD Ejemplo ',
  goalsFor: '',
  goalsAgainst: '',
}

function setup() {
  const matchAdminRepository = {
    getMatches: vi
      .fn()
      .mockResolvedValue([
        match(1, 1, 5, '2026-11-08T17:30:00Z'),
        match(2, 2, 1, '2026-11-15T17:30:00Z'),
        match(3, 1, 6, '2026-11-22T17:30:00Z'),
      ]),
    createMatch: vi.fn().mockResolvedValue(9),
    updateMatch: vi.fn().mockResolvedValue(),
    deleteMatch: vi.fn().mockResolvedValue(),
  }
  const seasonAdminRepository = { getCompetitions: vi.fn().mockResolvedValue(COMPETITIONS) }
  return {
    matchAdminRepository,
    useCases: createMatchAdminUseCases({ matchAdminRepository, seasonAdminRepository }),
  }
}

describe('casos de uso de los partidos', () => {
  it('lista los partidos de la temporada, del más reciente al más antiguo, con su etiqueta y competición', async () => {
    const { matchAdminRepository, useCases } = setup()

    const { matches, competitions } = await useCases.listMatches(2)

    expect(matchAdminRepository.getMatches).toHaveBeenCalledWith(2)
    expect(matches.map((m) => [m.id, m.label, m.competition.name])).toEqual([
      [3, 'J6', 'Liga'],
      [2, 'Copa J1', 'Copa local'],
      [1, 'J5', 'Liga'],
    ])
    expect(competitions).toEqual(COMPETITIONS)
  })

  it('crea un partido con el rival sin espacios de más y la jornada como número; sin resultado, sin goles', async () => {
    const { matchAdminRepository, useCases } = setup()

    expect(await useCases.saveMatch(DATA)).toBe(9)
    expect(matchAdminRepository.createMatch).toHaveBeenCalledWith(2, {
      competitionId: 1,
      round: 7,
      date: DATA.date,
      opponent: 'CD Ejemplo',
      goalsFor: null,
      goalsAgainst: null,
    })
  })

  it('con id, edita el partido (también el resultado)', async () => {
    const { matchAdminRepository, useCases } = setup()

    expect(
      await useCases.saveMatch({
        ...DATA,
        id: 3,
        date: new Date('2026-11-22T17:30:00Z'),
        goalsFor: '4',
        goalsAgainst: '2',
      }),
    ).toBe(3)
    expect(matchAdminRepository.updateMatch).toHaveBeenCalledWith(
      3,
      expect.objectContaining({ goalsFor: 4, goalsAgainst: 2 }),
    )
  })

  it.each([
    [{ opponent: ' ' }, 'Pon el nombre del rival.'],
    [{ round: '0' }, 'La jornada tiene que ser un número mayor que 0.'],
    [{ round: '2.5' }, 'La jornada tiene que ser un número mayor que 0.'],
    [{ date: new Date('') }, 'Pon la fecha y la hora del partido.'],
    [{ goalsFor: '-1', goalsAgainst: '0' }, 'Los goles tienen que ser un número, 0 o más.'],
    [{ goalsFor: '3', goalsAgainst: '' }, 'Pon los dos goles del resultado, o ninguno.'],
  ])('con %o no guarda y lo explica', async (change, phrase) => {
    const { matchAdminRepository, useCases } = setup()

    await expect(useCases.saveMatch({ ...DATA, ...change })).rejects.toThrow(phrase)
    expect(matchAdminRepository.createMatch).not.toHaveBeenCalled()
  })

  it('un partido que aún no se ha jugado no puede tener resultado, al crearlo ni al editarlo', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-26T12:00:00Z'), toFake: ['Date'] })
    const { matchAdminRepository, useCases } = setup()
    const future = { ...DATA, date: new Date('2026-11-29T17:30:00Z'), goalsFor: '2', goalsAgainst: '1' }
    const phrase = 'Un partido que aún no se ha jugado no puede tener resultado.'

    await expect(useCases.saveMatch(future)).rejects.toThrow(phrase)
    await expect(useCases.saveMatch({ ...future, id: 3 })).rejects.toThrow(phrase)
    expect(matchAdminRepository.createMatch).not.toHaveBeenCalled()
    expect(matchAdminRepository.updateMatch).not.toHaveBeenCalled()
    // Sin resultado, una fecha futura vale.
    await expect(useCases.saveMatch({ ...future, goalsFor: '', goalsAgainst: '' })).resolves.toBe(9)
    vi.useRealTimers()
  })

  it('borra un partido', async () => {
    const { matchAdminRepository, useCases } = setup()

    await useCases.deleteMatch(3)

    expect(matchAdminRepository.deleteMatch).toHaveBeenCalledWith(3)
  })
})
