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
  match_squad: [{ count: 8 }],
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
        calledCount: 8,
      },
    ])
    expect(calls).toEqual([
      [
        ['from', 'matches'],
        // El recuento de convocados viene en la misma consulta, por la clave directa: con solo match_squad(count)
        // PostgREST no sabe si ir por ella o a través de `votes` (PGRST201) y no devuelve nada.
        [
          'select',
          'id, competition_id, round, match_date, opponent, goals_for, goals_against, is_finished, ' +
            'match_squad!match_squad_match_id_fkey(count)',
        ],
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

describe('convocatoria del partido', () => {
  it('da la convocatoria de un partido', async () => {
    const { calls, repository } = setup({
      data: [{ player_id: 3, minutes: 30, yellow_card: true, red_card: false }],
      error: null,
    })

    expect(await repository.getSquad(6)).toEqual([{ playerId: 3, minutes: 30, yellow: true, red: false }])
    expect(calls).toEqual([
      [
        ['from', 'match_squad'],
        ['select', 'player_id, minutes, yellow_card, red_card'],
        ['eq', 'match_id', 6],
      ],
    ])
  })

  it('da los goles y los penaltis fallados del partido', async () => {
    const { calls, repository } = setup(
      { data: [{ id: 1, scorer_id: 3, assist_id: 7, type: 'regular' }], error: null },
      { data: [{ id: 2, player_id: 11, type: 'penalty' }], error: null },
    )

    expect(await repository.getMatchEvents(6)).toEqual({
      goals: [{ id: 1, scorerId: 3, assistId: 7, type: 'regular' }],
      missedPenalties: [{ id: 2, playerId: 11, type: 'penalty' }],
    })
    expect(calls).toEqual([
      [
        ['from', 'goals'],
        ['select', 'id, scorer_id, assist_id, type'],
        ['eq', 'match_id', 6],
      ],
      [
        ['from', 'missed_penalties'],
        ['select', 'id, player_id, type'],
        ['eq', 'match_id', 6],
      ],
    ])
  })

  it('guarda a los convocados en una sola petición (alta o cambio)', async () => {
    const { calls, repository } = setup({ data: null, error: null })

    await repository.saveSquad(6, [{ playerId: 3, minutes: 35, yellow: true, red: false }])

    expect(calls).toEqual([
      [
        ['from', 'match_squad'],
        [
          'upsert',
          [{ match_id: 6, player_id: 3, minutes: 35, yellow_card: true, red_card: false }],
          { onConflict: 'match_id,player_id' },
        ],
      ],
    ])
  })

  it('sin convocados que guardar, no pide nada', async () => {
    const { calls, repository } = setup()

    await repository.saveSquad(6, [])

    expect(calls).toEqual([])
  })

  it('quita de la convocatoria a varios en una sola petición', async () => {
    const { calls, repository } = setup({ data: null, error: null })

    await repository.removeFromSquad(6, [4, 5])

    expect(calls).toEqual([
      [
        ['from', 'match_squad'],
        ['delete'],
        ['eq', 'match_id', 6],
        ['in', 'player_id', [4, 5]],
      ],
    ])
  })

  it('lo que protege la base de datos (votos, goles) llega con su frase', async () => {
    const voted = {
      data: null,
      error: { code: 'P0001', message: 'Navi ya tiene votos en este partido: no se puede quitar de la convocatoria' },
    }

    await expect(setup(voted).repository.removeFromSquad(6, [4])).rejects.toThrow(
      'Navi ya tiene votos en este partido: no se puede quitar de la convocatoria.',
    )
  })

  it('si algo falla, lo dice', async () => {
    const { repository } = setup(FAILED, FAILED, FAILED, FAILED, FAILED)

    await expect(repository.getSquad(6)).rejects.toThrow('No se pudo cargar la convocatoria.')
    await expect(repository.getMatchEvents(6)).rejects.toThrow('No se pudieron cargar los goles.')
    await expect(repository.saveSquad(6, [{ playerId: 3, minutes: 1, yellow: false, red: false }])).rejects.toThrow(
      'No se pudo guardar la convocatoria.',
    )
    await expect(repository.removeFromSquad(6, [4])).rejects.toThrow('No se pudo guardar la convocatoria.')
  })
})

describe('goles y penaltis fallados', () => {
  it('apunta un gol y uno fallado', async () => {
    const { calls, repository } = setup({ data: null, error: null }, { data: null, error: null })

    await repository.addGoal(6, { scorerId: 3, assistId: 4, type: 'regular' })
    await repository.addMissedPenalty(6, { playerId: 3, type: 'double_penalty' })

    expect(calls).toEqual([
      [
        ['from', 'goals'],
        ['insert', { match_id: 6, scorer_id: 3, assist_id: 4, type: 'regular' }],
      ],
      [
        ['from', 'missed_penalties'],
        ['insert', { match_id: 6, player_id: 3, type: 'double_penalty' }],
      ],
    ])
  })

  it('los borra pidiendo la fila de vuelta', async () => {
    const { calls, repository } = setup()

    await repository.deleteGoal(1)
    await repository.deleteMissedPenalty(9)

    expect(calls).toEqual([
      [['from', 'goals'], ['delete'], ['eq', 'id', 1], ['select', 'id'], ['single']],
      [['from', 'missed_penalties'], ['delete'], ['eq', 'id', 9], ['select', 'id'], ['single']],
    ])
  })

  it('más goles que el resultado, o un goleador sin minutos, llegan con la frase de la base de datos', async () => {
    const tooMany = {
      data: null,
      error: { code: 'P0001', message: 'Habría 5 goles registrados y el partido tiene 4 a favor' },
    }

    await expect(setup(tooMany).repository.addGoal(6, { scorerId: 3, assistId: null, type: 'regular' })).rejects.toThrow(
      'Habría 5 goles registrados y el partido tiene 4 a favor.',
    )
  })

  it('si algo falla, lo dice', async () => {
    const { repository } = setup(FAILED, FAILED, FAILED, FAILED)

    await expect(repository.addGoal(6, { scorerId: 3, assistId: null, type: 'regular' })).rejects.toThrow(
      'No se pudo apuntar el gol.',
    )
    await expect(repository.deleteGoal(1)).rejects.toThrow('No se pudo borrar el gol.')
    await expect(repository.addMissedPenalty(6, { playerId: 3, type: 'penalty' })).rejects.toThrow(
      'No se pudo apuntar el penalti fallado.',
    )
    await expect(repository.deleteMissedPenalty(9)).rejects.toThrow('No se pudo borrar el penalti fallado.')
  })
})

describe('terminar y reabrir', () => {
  it('marca el partido como terminado (o no) y pide la fila de vuelta', async () => {
    const { calls, repository } = setup()

    await repository.setFinished(6, true)
    await repository.setFinished(6, false)

    expect(calls).toEqual([
      [['from', 'matches'], ['update', { is_finished: true }], ['eq', 'id', 6], ['select', 'id'], ['single']],
      [['from', 'matches'], ['update', { is_finished: false }], ['eq', 'id', 6], ['select', 'id'], ['single']],
    ])
  })

  it('reabrir con votos (o terminar con fecha futura) lo impide la base de datos, con su frase', async () => {
    const voted = { data: null, error: { code: 'P0001', message: 'No se puede reabrir un partido que ya tiene votos' } }

    await expect(setup(voted).repository.setFinished(6, false)).rejects.toThrow(
      'No se puede reabrir un partido que ya tiene votos.',
    )
  })

  it('si algo falla, lo dice', async () => {
    const { repository } = setup(FAILED, FAILED)

    await expect(repository.setFinished(6, true)).rejects.toThrow('No se pudo terminar el partido.')
    await expect(repository.setFinished(6, false)).rejects.toThrow('No se pudo reabrir el partido.')
  })
})
