import { describe, expect, it, vi } from 'vitest'
import { createSupabaseProfileRepository } from './profile-repository'

// Cliente falso con la cadena from().select().eq().single() y espías para ver qué se pide.
function setup(result) {
  const single = vi.fn().mockResolvedValue(result)
  const eq = vi.fn().mockReturnValue({ single })
  const select = vi.fn().mockReturnValue({ eq })
  const from = vi.fn().mockReturnValue({ select })
  return { from, select, eq, repository: createSupabaseProfileRepository({ from }) }
}

describe('repositorio de perfiles de Supabase', () => {
  it('pide el perfil propio por id y lo traduce a camelCase', async () => {
    const row = { id: 'u1', email: 'jugador@example.com', full_name: 'Jugador', role: 'admin' }
    const { repository, from, select, eq } = setup({ data: row, error: null })

    expect(await repository.getById('u1')).toEqual({
      id: 'u1',
      email: 'jugador@example.com',
      fullName: 'Jugador',
      role: 'admin',
    })
    expect(from).toHaveBeenCalledWith('profiles')
    expect(select).toHaveBeenCalledWith('id, email, full_name, role')
    expect(eq).toHaveBeenCalledWith('id', 'u1')
  })

  it('devuelve null si no hay fila o hay error', async () => {
    const { repository } = setup({ data: null, error: { message: 'no rows' } })

    expect(await repository.getById('u1')).toBeNull()
  })
})
