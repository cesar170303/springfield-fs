import { describe, expect, it } from 'vitest'
import { createSupabaseSeasonAdminRepository } from './season-admin-repository'

// Cliente falso: apunta los pasos de cada petición ([['from', 'seasons'], ['select', …], …]) y responde por orden.
function setup(...results) {
  const calls = []
  function from(table) {
    const steps = [['from', table]]
    const result = results[calls.length] ?? { data: null, error: null }
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
  return { calls, repository: createSupabaseSeasonAdminRepository({ from }) }
}

const DATA = { name: '2027/28', startDate: '2027-09-01', endDate: '2028-06-30' }
const ROW = { name: '2027/28', start_date: '2027-09-01', end_date: '2028-06-30' }
const FAILED = { data: null, error: { code: '', message: 'TypeError: Failed to fetch' } }

describe('repositorio de temporadas del panel', () => {
  it('da las temporadas de la más reciente a la más antigua, con sus fechas', async () => {
    const { calls, repository } = setup({ data: [{ id: 2, ...ROW, is_current: true }], error: null })

    expect(await repository.getSeasons()).toEqual([{ id: 2, ...DATA, isCurrent: true }])
    expect(calls).toEqual([
      [
        ['from', 'seasons'],
        ['select', 'id, name, start_date, end_date, is_current'],
        ['order', 'start_date', { ascending: false }],
      ],
    ])
  })

  it('si no se pueden leer, lanza un error', async () => {
    await expect(setup(FAILED).repository.getSeasons()).rejects.toThrow(
      'No se pudieron cargar las temporadas. Inténtalo de nuevo.',
    )
  })

  it('crea una temporada', async () => {
    const { calls, repository } = setup()

    await repository.createSeason(DATA)

    expect(calls).toEqual([
      [
        ['from', 'seasons'],
        ['insert', ROW],
      ],
    ])
  })

  it('edita una temporada y pide la fila de vuelta, para no dar por guardado lo que RLS ha ignorado', async () => {
    const { calls, repository } = setup()

    await repository.updateSeason(2, DATA)

    expect(calls).toEqual([[['from', 'seasons'], ['update', ROW], ['eq', 'id', 2], ['select', 'id'], ['single']]])
  })

  it('al marcar la actual, primero desmarca la que lo era (solo puede haber una)', async () => {
    const { calls, repository } = setup()

    await repository.setCurrentSeason(2)

    expect(calls).toEqual([
      [
        ['from', 'seasons'],
        ['update', { is_current: false }],
        ['eq', 'is_current', true],
        ['neq', 'id', 2],
      ],
      [['from', 'seasons'], ['update', { is_current: true }], ['eq', 'id', 2], ['select', 'id'], ['single']],
    ])
  })

  it('si no puede desmarcar la anterior, no sigue', async () => {
    const { calls, repository } = setup(FAILED)

    await expect(repository.setCurrentSeason(2)).rejects.toThrow('No se pudo cambiar la temporada actual.')
    expect(calls).toHaveLength(1)
  })

  it('si no puede marcar la nueva, lo dice', async () => {
    const { repository } = setup({ data: null, error: null }, FAILED)

    await expect(repository.setCurrentSeason(2)).rejects.toThrow('No se pudo cambiar la temporada actual.')
  })

  it('da las competiciones con su tipo', async () => {
    const { calls, repository } = setup({ data: [{ id: 1, name: 'Liga', type: 'league' }], error: null })

    expect(await repository.getCompetitions()).toEqual([{ id: 1, name: 'Liga', type: 'league' }])
    expect(calls).toEqual([
      [
        ['from', 'competitions'],
        ['select', 'id, name, type'],
        ['order', 'id'],
      ],
    ])
  })

  it('crea y edita competiciones', async () => {
    const { calls, repository } = setup()
    const data = { name: 'Amistosos', type: 'friendly' }

    await repository.createCompetition(data)
    await repository.updateCompetition(3, data)

    expect(calls).toEqual([
      [
        ['from', 'competitions'],
        ['insert', data],
      ],
      [['from', 'competitions'], ['update', data], ['eq', 'id', 3], ['select', 'id'], ['single']],
    ])
  })

  it('si fallan las competiciones, lo dice', async () => {
    const { repository } = setup(FAILED, FAILED, FAILED)

    await expect(repository.getCompetitions()).rejects.toThrow('No se pudieron cargar las competiciones.')
    await expect(repository.createCompetition({})).rejects.toThrow('No se pudo guardar la competición.')
    await expect(repository.updateCompetition(3, {})).rejects.toThrow('No se pudo guardar la competición.')
  })

  it('un nombre repetido se explica, al crear y al editar', async () => {
    const repeated = { data: null, error: { code: '23505', message: 'unique constraint "seasons_name_key"' } }

    await expect(setup(repeated).repository.createSeason(DATA)).rejects.toThrow('Ya hay una temporada con ese nombre.')
    await expect(setup(repeated).repository.updateSeason(2, DATA)).rejects.toThrow(
      'Ya hay una temporada con ese nombre.',
    )
  })
})
