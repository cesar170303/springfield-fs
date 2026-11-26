import { describe, expect, it } from 'vitest'
import { playersToAdd, previousSeason, rosterToCopy } from './roster'

const player = (id, nickname, archived = false) => ({ id, nickname, firstName: `N${id}`, archived })
const season = (id, startDate) => ({ id, name: `T${id}`, startDate })

describe('playersToAdd', () => {
  it('ofrece las fichas no archivadas que aún no están en la plantilla, por nombre', () => {
    const players = [player(1, 'Navi'), player(2, 'Álvaro'), player(3, 'Checo', true), player(4, 'Dani')]

    expect(playersToAdd(players, [{ playerId: 4, shirtNumber: 4 }]).map((p) => p.id)).toEqual([2, 1])
  })
})

describe('previousSeason', () => {
  const seasons = [season(3, '2027-09-01'), season(1, '2025-09-01'), season(2, '2026-09-01')]

  it('es la que empezó justo antes, estén en el orden que estén', () => {
    expect(previousSeason(seasons, 3)?.id).toBe(2)
    expect(previousSeason(seasons, 2)?.id).toBe(1)
  })

  it('la primera no tiene anterior', () => {
    expect(previousSeason(seasons, 1)).toBeNull()
  })
})

describe('rosterToCopy', () => {
  it('copia a los no archivados con su dorsal', () => {
    const players = [player(1, 'Navi'), player(2, 'Checo', true), player(3, 'Dani')]
    const roster = [
      { playerId: 1, shirtNumber: 9 },
      { playerId: 2, shirtNumber: 7 },
      { playerId: 3, shirtNumber: 4 },
    ]

    expect(rosterToCopy(roster, players)).toEqual([
      { playerId: 1, shirtNumber: 9 },
      { playerId: 3, shirtNumber: 4 },
    ])
  })
})
