import { describe, expect, it } from 'vitest'
import { LEADER_STATS, POSITION_OPTIONS, groupByPosition, playerName, positionLabel, sortSquad, topThree } from './squad'

// Jugador mínimo: solo lo que miran estas reglas.
const player = (shirtNumber, stats = {}) => ({
  shirtNumber,
  position: 'winger',
  goals: 0,
  assists: 0,
  avgRating: null,
  mvps: 0,
  matchesPlayed: 0,
  yellowCards: 0,
  redCards: 0,
  ...stats,
})
const shirts = (players) => players.map((p) => p.shirtNumber)
const stat = (key) => LEADER_STATS.find((s) => s.key === key)

describe('playerName', () => {
  it('usa el apodo y, si no tiene, el nombre', () => {
    expect(playerName({ nickname: 'Chino', firstName: 'Luis' })).toBe('Chino')
    expect(playerName({ nickname: null, firstName: 'Luis' })).toBe('Luis')
  })
})

describe('positionLabel', () => {
  it('nombra la posición como en la pista', () => {
    expect(positionLabel('goalkeeper')).toBe('Portero')
    expect(positionLabel('winger')).toBe('Ala')
  })
})

describe('sortSquad', () => {
  const squad = [player(10, { goals: 3 }), player(4, { goals: 5 }), player(7, { goals: 3 })]

  it('por defecto ordena por dorsal', () => {
    expect(shirts(sortSquad(squad, 'shirt'))).toEqual([4, 7, 10])
  })

  it('por una estadística, de mayor a menor y, si empatan, por dorsal', () => {
    expect(shirts(sortSquad(squad, 'goals'))).toEqual([4, 7, 10])
  })

  it('en tarjetas pesan más las rojas que las amarillas', () => {
    const cards = [player(2, { yellowCards: 3 }), player(3, { redCards: 1 }), player(1, { yellowCards: 1 })]

    expect(shirts(sortSquad(cards, 'cards'))).toEqual([3, 2, 1])
  })

  it('quien no tiene nota va al final al ordenar por valoración', () => {
    const rated = [player(1), player(2, { avgRating: 6.5 }), player(3, { avgRating: 8 })]

    expect(shirts(sortSquad(rated, 'avgRating'))).toEqual([3, 2, 1])
  })

  it('no cambia la lista original', () => {
    sortSquad(squad, 'goals')

    expect(shirts(squad)).toEqual([10, 4, 7])
  })
})

describe('groupByPosition', () => {
  it('agrupa en el orden de la pista, por dorsal y sin grupos vacíos', () => {
    const groups = groupByPosition([
      player(9, { position: 'pivot' }),
      player(1, { position: 'goalkeeper' }),
      player(5, { position: 'pivot' }),
    ])

    expect(groups.map((g) => [g.label, shirts(g.players)])).toEqual([
      ['Portero', [1]],
      ['Pívot', [5, 9]],
    ])
  })
})

describe('topThree', () => {
  it('devuelve los 3 mejores, sin quien tiene 0', () => {
    const squad = [
      player(1, { goals: 2 }),
      player(2),
      player(3, { goals: 7 }),
      player(4, { goals: 2 }),
      player(5, { goals: 1 }),
    ]

    expect(shirts(topThree(squad, stat('goals')))).toEqual([3, 1, 4])
  })

  it('en valoración deja fuera a quien no tiene nota', () => {
    expect(shirts(topThree([player(1), player(2, { avgRating: 7 })], stat('avgRating')))).toEqual([2])
  })

  it('suma goles y asistencias', () => {
    const squad = [player(1, { goals: 2, assists: 2 }), player(2, { goals: 3 })]

    expect(shirts(topThree(squad, stat('goalsPlusAssists')))).toEqual([1, 2])
  })

  it('las seis tarjetas de líderes, en el orden decidido', () => {
    expect(LEADER_STATS.map((s) => s.label)).toEqual([
      'Goleadores',
      'Asistencias',
      'Goles + asistencias',
      'Valoración media',
      'MVPs',
      'Tarjetas',
    ])
  })
})

it('ofrece las posiciones en el orden de la pista, para elegir en un formulario', () => {
  expect(POSITION_OPTIONS).toEqual([
    { value: 'goalkeeper', label: 'Portero' },
    { value: 'defender', label: 'Cierre' },
    { value: 'winger', label: 'Ala' },
    { value: 'pivot', label: 'Pívot' },
    { value: 'universal', label: 'Universal' },
  ])
})
