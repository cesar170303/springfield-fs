import { describe, expect, it, vi } from 'vitest'
import { createSupabasePlayerAdminRepository } from './player-admin-repository'

// Cliente falso: apunta los pasos de cada consulta a una tabla y responde por orden; rpc y storage, aparte.
function setup({
  from: results = [],
  rpc: rpcResult = { data: [], error: null },
  storage: storageResult = { data: {}, error: null },
} = {}) {
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
  const rpc = vi.fn().mockResolvedValue(rpcResult)
  const bucket = {
    getPublicUrl: (path) => ({ data: { publicUrl: `https://cdn.test/${path}` } }),
    upload: vi.fn().mockResolvedValue(storageResult),
    remove: vi.fn().mockResolvedValue(storageResult),
  }
  const storage = { from: vi.fn(() => bucket) }
  return { calls, rpc, bucket, storage, repository: createSupabasePlayerAdminRepository({ from, rpc, storage }) }
}

const ROW = {
  id: 3,
  first_name: 'Sergio',
  last_name: 'López',
  nickname: 'Checo',
  user_id: null,
  position: 'winger',
  status: 'injured',
  photo_path: 'players/3.webp',
  archived_at: null,
}
const DATA = {
  firstName: 'Sergio',
  lastName: 'López',
  nickname: 'Checo',
  email: 'sergio@example.com',
  position: 'winger',
  status: 'injured',
}
const SAVED_ROW = {
  first_name: 'Sergio',
  last_name: 'López',
  nickname: 'Checo',
  email: 'sergio@example.com',
  position: 'winger',
  status: 'injured',
}
const FAILED = { data: null, error: { code: '', message: 'TypeError: Failed to fetch' } }

describe('repositorio de fichas del panel', () => {
  it('da las fichas con su correo (de get_player_emails), su foto y si tienen cuenta', async () => {
    const { calls, rpc, repository } = setup({
      from: [{ data: [ROW, { ...ROW, id: 4, user_id: 'u-4', photo_path: null, archived_at: '2026-11-01' }], error: null }],
      rpc: { data: [{ player_id: 3, email: 'sergio@example.com' }, { player_id: 4, email: null }], error: null },
    })

    expect(await repository.getPlayers()).toEqual([
      { id: 3, ...DATA, photoPath: 'players/3.webp', photoUrl: 'https://cdn.test/players/3.webp', hasAccount: false, archived: false },
      { id: 4, ...DATA, email: null, photoPath: null, photoUrl: null, hasAccount: true, archived: true },
    ])
    expect(rpc).toHaveBeenCalledExactlyOnceWith('get_player_emails')
    // El correo no es legible en `players`: pedirlo (o select *) haría fallar la consulta entera.
    expect(calls).toEqual([
      [
        ['from', 'players'],
        ['select', 'id, first_name, last_name, nickname, user_id, position, status, photo_path, archived_at'],
      ],
    ])
  })

  it('si no se pueden leer las fichas o los correos, lo dice', async () => {
    const phrase = 'No se pudieron cargar los jugadores. Inténtalo de nuevo.'

    await expect(setup({ from: [FAILED] }).repository.getPlayers()).rejects.toThrow(phrase)
    await expect(setup({ from: [{ data: [], error: null }], rpc: FAILED }).repository.getPlayers()).rejects.toThrow(phrase)
  })

  it('crea una ficha y da su id, pidiendo de vuelta solo el id (el correo no se puede leer)', async () => {
    const { calls, repository } = setup({ from: [{ data: { id: 9 }, error: null }] })

    expect(await repository.createPlayer(DATA)).toBe(9)
    expect(calls).toEqual([[['from', 'players'], ['insert', SAVED_ROW], ['select', 'id'], ['single']]])
  })

  it('edita una ficha y pide la fila de vuelta, para no dar por guardado lo que RLS ha ignorado', async () => {
    const { calls, repository } = setup()

    await repository.updatePlayer(3, DATA)

    expect(calls).toEqual([[['from', 'players'], ['update', SAVED_ROW], ['eq', 'id', 3], ['select', 'id'], ['single']]])
  })

  it('un correo repetido se explica, al crear y al editar', async () => {
    const repeated = { data: null, error: { code: '23505', message: 'unique constraint "players_email_key"' } }
    const phrase = 'Ya hay una ficha con ese correo.'

    await expect(setup({ from: [repeated] }).repository.createPlayer(DATA)).rejects.toThrow(phrase)
    await expect(setup({ from: [repeated] }).repository.updatePlayer(3, DATA)).rejects.toThrow(phrase)
  })

  it('si no se puede guardar por otra cosa, lo dice', async () => {
    await expect(setup({ from: [FAILED] }).repository.createPlayer(DATA)).rejects.toThrow(
      'No se pudo guardar la ficha. Inténtalo de nuevo.',
    )
  })

  it('archiva con la fecha de hoy y recupera quitándola', async () => {
    vi.setSystemTime(new Date('2026-11-26T10:00:00Z'))
    const { calls, repository } = setup()

    await repository.setArchived(3, true)
    await repository.setArchived(3, false)
    vi.useRealTimers()

    expect(calls).toEqual([
      [['from', 'players'], ['update', { archived_at: '2026-11-26T10:00:00.000Z' }], ['eq', 'id', 3], ['select', 'id'], ['single']],
      [['from', 'players'], ['update', { archived_at: null }], ['eq', 'id', 3], ['select', 'id'], ['single']],
    ])
  })

  it('si no puede archivar o recuperar, lo dice', async () => {
    const { repository } = setup({ from: [FAILED, FAILED] })

    await expect(repository.setArchived(3, true)).rejects.toThrow('No se pudo archivar la ficha.')
    await expect(repository.setArchived(3, false)).rejects.toThrow('No se pudo recuperar la ficha.')
  })
})

describe('fotos en el almacén', () => {
  const blob = new Blob(['x'], { type: 'image/webp' })

  it('sube la foto al bucket de fotos, con su tipo, sin pisar ningún archivo', async () => {
    const { bucket, storage, repository } = setup()

    await repository.uploadPhoto('players/3-1.webp', blob)

    expect(storage.from).toHaveBeenCalledWith('player-photos')
    expect(bucket.upload).toHaveBeenCalledWith('players/3-1.webp', blob, {
      contentType: 'image/webp',
      cacheControl: '31536000', // el nombre cambia con cada foto: se puede guardar en caché un año
      upsert: false,
    })
  })

  it('si no se puede subir, lo dice', async () => {
    const failed = { data: null, error: { message: 'The object exceeded the maximum allowed size' } }

    await expect(setup({ storage: failed }).repository.uploadPhoto('players/3-1.webp', blob)).rejects.toThrow(
      'No se pudo subir la foto. Inténtalo de nuevo.',
    )
  })

  it('apunta la foto en la ficha (o la quita) y pide la fila de vuelta', async () => {
    const { calls, repository } = setup()

    await repository.setPhotoPath(3, 'players/3-1.webp')
    await repository.setPhotoPath(3, null)

    expect(calls).toEqual([
      [['from', 'players'], ['update', { photo_path: 'players/3-1.webp' }], ['eq', 'id', 3], ['select', 'id'], ['single']],
      [['from', 'players'], ['update', { photo_path: null }], ['eq', 'id', 3], ['select', 'id'], ['single']],
    ])
  })

  it('si no se puede apuntar, lo dice', async () => {
    await expect(setup({ from: [FAILED] }).repository.setPhotoPath(3, 'p')).rejects.toThrow(
      'No se pudo guardar la foto. Inténtalo de nuevo.',
    )
  })

  it('borra un archivo del bucket', async () => {
    const { bucket, repository } = setup()

    await repository.deletePhoto('players/3-1.webp')

    expect(bucket.remove).toHaveBeenCalledWith(['players/3-1.webp'])
  })

  it('si no se puede borrar, lo dice', async () => {
    const failed = { data: null, error: { message: 'x' } }

    await expect(setup({ storage: failed }).repository.deletePhoto('p')).rejects.toThrow('No se pudo borrar la foto.')
  })
})
