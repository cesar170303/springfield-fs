import { describe, expect, it, vi } from 'vitest'
import { createAccountAdminUseCases } from './admin-accounts'

const VIEWERS = [
  { id: 'u-2', fullName: 'Rosa Ejemplo', email: 'rosa@example.com' },
  { id: 'u-1', fullName: null, email: 'ana@example.com' },
  { id: 'u-3', fullName: 'Benito Ejemplo', email: 'benito@example.com' },
]

function setup() {
  const accountAdminRepository = {
    getViewers: vi.fn().mockResolvedValue(VIEWERS),
    getSeasonVoters: vi.fn().mockResolvedValue(['u-3']),
    addSeasonVoter: vi.fn().mockResolvedValue(),
    removeSeasonVoter: vi.fn().mockResolvedValue(),
    getAccounts: vi.fn().mockResolvedValue([
      { id: 'me', fullName: 'Yo Ejemplo', email: 'yo@example.com', role: 'superadmin' },
      { id: 'u-2', fullName: null, email: 'checo@example.com', role: 'player' },
      { id: 'u-3', fullName: 'Ana Ejemplo', email: 'ana@example.com', role: 'admin' },
      { id: 'u-4', fullName: 'Otro Super', email: 'super@example.com', role: 'superadmin' },
      { id: 'u-5', fullName: 'Benito Ejemplo', email: 'benito@example.com', role: 'viewer' },
    ]),
    getLinkedPlayers: vi.fn().mockResolvedValue([{ userId: 'u-2', nickname: 'Checo', firstName: 'Sergio' }]),
    setRole: vi.fn().mockResolvedValue(),
  }
  return { accountAdminRepository, useCases: createAccountAdminUseCases({ accountAdminRepository }) }
}

describe('casos de uso de los votantes', () => {
  it('da los viewers por nombre (o correo, si no tienen) y si votan en la temporada', async () => {
    const { accountAdminRepository, useCases } = setup()

    expect(await useCases.getSeasonVoters(2)).toEqual([
      { id: 'u-1', name: 'ana@example.com', email: 'ana@example.com', votes: false },
      { id: 'u-3', name: 'Benito Ejemplo', email: 'benito@example.com', votes: true },
      { id: 'u-2', name: 'Rosa Ejemplo', email: 'rosa@example.com', votes: false },
    ])
    expect(accountAdminRepository.getSeasonVoters).toHaveBeenCalledWith(2)
  })

  it('marca y desmarca a un viewer como votante de la temporada', async () => {
    const { accountAdminRepository, useCases } = setup()

    await useCases.setSeasonVoter({ seasonId: 2, userId: 'u-1', votes: true })
    await useCases.setSeasonVoter({ seasonId: 2, userId: 'u-3', votes: false })

    expect(accountAdminRepository.addSeasonVoter).toHaveBeenCalledExactlyOnceWith(2, 'u-1')
    expect(accountAdminRepository.removeSeasonVoter).toHaveBeenCalledExactlyOnceWith(2, 'u-3')
  })
})

describe('usuarios y roles', () => {
  it('lista las cuentas por nombre, con su ficha vinculada y si se pueden cambiar', async () => {
    const { useCases } = setup()

    expect(await useCases.listAccounts('me')).toEqual([
      { id: 'u-3', name: 'Ana Ejemplo', email: 'ana@example.com', role: 'admin', player: null, canChange: true },
      { id: 'u-5', name: 'Benito Ejemplo', email: 'benito@example.com', role: 'viewer', player: null, canChange: true },
      {
        id: 'u-2',
        name: 'checo@example.com',
        email: 'checo@example.com',
        role: 'player',
        player: 'Checo',
        canChange: true,
      },
      // Ni otro superadmin ni la propia cuenta se tocan desde la app.
      { id: 'u-4', name: 'Otro Super', email: 'super@example.com', role: 'superadmin', player: null, canChange: false },
      { id: 'me', name: 'Yo Ejemplo', email: 'yo@example.com', role: 'superadmin', player: null, canChange: false },
    ])
  })

  it('hace admin a una cuenta', async () => {
    const { accountAdminRepository, useCases } = setup()

    await useCases.makeAdmin('u-5')

    expect(accountAdminRepository.setRole).toHaveBeenCalledWith('u-5', 'admin')
  })

  it('al quitar el admin, vuelve a jugador si tiene ficha y a viewer si no', async () => {
    const { accountAdminRepository, useCases } = setup()

    await useCases.removeAdmin({ id: 'u-3', player: 'Ana' })
    await useCases.removeAdmin({ id: 'u-6', player: null })

    expect(accountAdminRepository.setRole.mock.calls).toEqual([
      ['u-3', 'player'],
      ['u-6', 'viewer'],
    ])
  })
})
