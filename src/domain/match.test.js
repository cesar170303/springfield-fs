import { describe, expect, it } from 'vitest'
import { COMPETITION_TYPES, competitionTypeLabel } from './match'

describe('tipos de competición', () => {
  it('son los tres de la base de datos, con la liga primero', () => {
    expect(COMPETITION_TYPES).toEqual([
      { value: 'league', label: 'Liga' },
      { value: 'cup', label: 'Copa' },
      { value: 'friendly', label: 'Amistoso' },
    ])
  })

  it('cada uno tiene su nombre', () => {
    expect(competitionTypeLabel('friendly')).toBe('Amistoso')
  })
})
