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
