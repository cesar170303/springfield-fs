import { describe, expect, it } from 'vitest'
import { createSupabaseAccountAdminRepository } from './account-admin-repository'

// Cliente falso: apunta los pasos de cada consulta ([['from', 'profiles'], ['select', …], …]) y responde por orden.
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
  return { calls, repository: createSupabaseAccountAdminRepository({ from }) }
}

const FAILED = { data: null, error: { code: '', message: 'TypeError: Failed to fetch' } }

describe('repositorio de cuentas del panel', () => {
  it('da las cuentas con rol viewer, con su nombre y su correo', async () => {
    const { calls, repository } = setup({
      data: [{ id: 'u-1', full_name: 'Rosa Ejemplo', email: 'rosa@example.com' }],
      error: null,
    })

    expect(await repository.getViewers()).toEqual([{ id: 'u-1', fullName: 'Rosa Ejemplo', email: 'rosa@example.com' }])
    expect(calls).toEqual([
      [
        ['from', 'profiles'],
        ['select', 'id, full_name, email'],
        ['eq', 'role', 'viewer'],
      ],
    ])
  })

  it('da quién vota en una temporada', async () => {
    const { calls, repository } = setup({ data: [{ user_id: 'u-1' }, { user_id: 'u-2' }], error: null })

    expect(await repository.getSeasonVoters(2)).toEqual(['u-1', 'u-2'])
    expect(calls).toEqual([
      [
        ['from', 'season_voters'],
        ['select', 'user_id'],
        ['eq', 'season_id', 2],
      ],
    ])
  })

  it('añade un votante (quién lo añade lo pone la base de datos) y lo quita pidiendo la fila de vuelta', async () => {
    const { calls, repository } = setup()

    await repository.addSeasonVoter(2, 'u-1')
    await repository.removeSeasonVoter(2, 'u-1')

    expect(calls).toEqual([
      [
        ['from', 'season_voters'],
        ['insert', { season_id: 2, user_id: 'u-1' }],
      ],
      [
        ['from', 'season_voters'],
        ['delete'],
        ['eq', 'season_id', 2],
        ['eq', 'user_id', 'u-1'],
        ['select', 'user_id'],
        ['single'],
      ],
    ])
  })

  it('si ya votaba, lo explica', async () => {
    const twice = { data: null, error: { code: '23505', message: 'unique constraint "season_voters_pkey"' } }

    await expect(setup(twice).repository.addSeasonVoter(2, 'u-1')).rejects.toThrow('Ya vota esta temporada.')
  })

  it('si algo falla, lo dice', async () => {
    const { repository } = setup(FAILED, FAILED, FAILED, FAILED)

    await expect(repository.getViewers()).rejects.toThrow('No se pudieron cargar los votantes.')
    await expect(repository.getSeasonVoters(2)).rejects.toThrow('No se pudieron cargar los votantes.')
    await expect(repository.addSeasonVoter(2, 'u-1')).rejects.toThrow('No se pudo guardar el votante.')
    await expect(repository.removeSeasonVoter(2, 'u-1')).rejects.toThrow('No se pudo quitar el votante.')
  })
})

describe('usuarios y roles', () => {
  it('da todas las cuentas con su nombre, correo y rol', async () => {
    const { calls, repository } = setup({
      data: [{ id: 'u-1', full_name: 'Rosa Ejemplo', email: 'rosa@example.com', role: 'viewer' }],
      error: null,
    })

    expect(await repository.getAccounts()).toEqual([
      { id: 'u-1', fullName: 'Rosa Ejemplo', email: 'rosa@example.com', role: 'viewer' },
    ])
    expect(calls).toEqual([
      [
        ['from', 'profiles'],
        ['select', 'id, full_name, email, role'],
      ],
    ])
  })

  it('da qué ficha tiene vinculada cada cuenta (columnas concretas: el correo de players no se lee)', async () => {
    const { calls, repository } = setup({
      data: [{ user_id: 'u-2', nickname: 'Checo', first_name: 'Sergio' }],
      error: null,
    })

    expect(await repository.getLinkedPlayers()).toEqual([{ userId: 'u-2', nickname: 'Checo', firstName: 'Sergio' }])
    expect(calls).toEqual([
      [
        ['from', 'players'],
        ['select', 'user_id, nickname, first_name'],
        ['not', 'user_id', 'is', null],
      ],
    ])
  })

  it('cambia el rol de una cuenta y pide la fila de vuelta', async () => {
    const { calls, repository } = setup()

    await repository.setRole('u-1', 'admin')

    expect(calls).toEqual([[['from', 'profiles'], ['update', { role: 'admin' }], ['eq', 'id', 'u-1'], ['select', 'id'], ['single']]])
  })

  it('si algo falla (o RLS lo ignora), lo dice', async () => {
    const { repository } = setup(FAILED, FAILED, FAILED)

    await expect(repository.getAccounts()).rejects.toThrow('No se pudieron cargar los usuarios.')
    await expect(repository.getLinkedPlayers()).rejects.toThrow('No se pudieron cargar los usuarios.')
    await expect(repository.setRole('u-1', 'admin')).rejects.toThrow('No se pudo cambiar el rol.')
    const ignored = { data: null, error: { code: 'PGRST116', message: 'x' } }
    await expect(setup(ignored).repository.setRole('u-1', 'admin')).rejects.toThrow(
      'No tienes permiso para hacer esto, o ya no existe.',
    )
  })
})
