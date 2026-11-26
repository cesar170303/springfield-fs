import { describe, expect, it } from 'vitest'
import { createSupabaseMatchAdminRepository } from './match-admin-repository'

// Cliente falso: apunta los pasos de cada consulta ([['from', 'matches'], ['select', …], …]) y responde por orden.
function setup(...results) {
  const calls = []
  function from(table) {
    const steps = [['from', table]]
    const result = results[calls.length] ?? { data: { id: 9 }, error: null }
    calls.push(steps)
    const query = new Proxy(
      {},
      {
        get(_, step) {
          if (step === 'then') return (resolve) => resolve(result)
          return (...args) => {
            steps.push([step, ...args])
            return query
          }
        },
      },
    )
    return query
  }
  return { calls, repository: createSupabaseMatchAdminRepository({ from }) }
}

const ROW = {
  id: 3,
  competition_id: 1,
  round: 6,
  match_date: '2026-11-22T17:30:00+00:00',
  opponent: 'CD Ejemplo',
  goals_for: 4,
  goals_against: 2,
  is_finished: false,
}
const DATA = {
  competitionId: 1,
  round: 7,
  date: new Date('2026-11-29T17:30:00Z'),
  opponent: 'CD Ejemplo',
  goalsFor: null,
  goalsAgainst: null,
}
const SAVED_ROW = {
  competition_id: 1,
  round: 7,
  match_date: '2026-11-29T17:30:00.000Z',
  opponent: 'CD Ejemplo',
  goals_for: null,
  goals_against: null,
}
const FAILED = { data: null, error: { code: '', message: 'TypeError: Failed to fetch' } }

describe('repositorio de partidos del panel', () => {
  it('da los partidos de una temporada, con la fecha como Date', async () => {
    const { calls, repository } = setup({ data: [ROW], error: null })

    expect(await repository.getMatches(2)).toEqual([
      {
        id: 3,
        competitionId: 1,
        round: 6,
        date: new Date('2026-11-22T17:30:00Z'),
        opponent: 'CD Ejemplo',
        goalsFor: 4,
        goalsAgainst: 2,
        isFinished: false,
      },
    ])
    expect(calls).toEqual([
      [
        ['from', 'matches'],
        ['select', 'id, competition_id, round, match_date, opponent, goals_for, goals_against, is_finished'],
        ['eq', 'season_id', 2],
      ],
    ])
  })

  it('crea un partido en la temporada y da su id', async () => {
    const { calls, repository } = setup({ data: { id: 9 }, error: null })

    expect(await repository.createMatch(2, DATA)).toBe(9)
    expect(calls).toEqual([
      [['from', 'matches'], ['insert', { season_id: 2, ...SAVED_ROW }], ['select', 'id'], ['single']],
    ])
  })

  it('edita y borra pidiendo la fila de vuelta', async () => {
    const { calls, repository } = setup()

    await repository.updateMatch(3, DATA)
    await repository.deleteMatch(3)

    expect(calls).toEqual([
      [['from', 'matches'], ['update', SAVED_ROW], ['eq', 'id', 3], ['select', 'id'], ['single']],
      [['from', 'matches'], ['delete'], ['eq', 'id', 3], ['select', 'id'], ['single']],
    ])
  })

  it('una jornada repetida en la misma competición se explica', async () => {
    const repeated = {
      data: null,
      error: { code: '23505', message: 'unique constraint "matches_season_id_competition_id_round_key"' },
    }
    const phrase = 'Ya hay un partido de esa competición en esa jornada.'

    await expect(setup(repeated).repository.createMatch(2, DATA)).rejects.toThrow(phrase)
    await expect(setup(repeated).repository.updateMatch(3, DATA)).rejects.toThrow(phrase)
  })

  it('las reglas de los triggers (votos, fecha futura…) llegan con su frase', async () => {
    const voted = { data: null, error: { code: 'P0001', message: 'No se puede borrar un partido que ya tiene votos' } }

    await expect(setup(voted).repository.deleteMatch(3)).rejects.toThrow(
      'No se puede borrar un partido que ya tiene votos.',
    )
  })

  it('si algo falla, lo dice', async () => {
    const { repository } = setup(FAILED, FAILED, FAILED, FAILED)

    await expect(repository.getMatches(2)).rejects.toThrow('No se pudieron cargar los partidos.')
    await expect(repository.createMatch(2, DATA)).rejects.toThrow('No se pudo guardar el partido.')
    await expect(repository.updateMatch(3, DATA)).rejects.toThrow('No se pudo guardar el partido.')
    await expect(repository.deleteMatch(3)).rejects.toThrow('No se pudo borrar el partido.')
  })
})
