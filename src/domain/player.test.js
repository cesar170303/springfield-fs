import { describe, expect, it } from 'vitest'
import { STATUS_OPTIONS, isVotingOpen, matchSummary, ratingFraction, ratingRange, statCards, statusLabel } from './player'

// Totales de la temporada tal como llegan de get_squad_stats (ya traducidos).
const fieldPlayer = {
  position: 'winger',
  matchesCalled: 11,
  matchesPlayed: 10,
  minutes: 312,
  goals: 11,
  penaltyGoals: 3,
  assists: 4,
  mvps: 3,
  yellowCards: 2,
  redCards: 0,
  goalsConceded: 0,
  cleanSheets: 0,
}
const card = (cards, key) => cards.find((c) => c.key === key)

describe('statCards', () => {
  it('a un jugador de campo: partidos, minutos, goles (destacados), asistencias, MVP y tarjetas', () => {
    const cards = statCards(fieldPlayer)

    expect(cards.map((c) => c.key)).toEqual(['matchesPlayed', 'minutes', 'goals', 'assists', 'mvps', 'cards'])
    expect(cards.filter((c) => c.highlight).map((c) => c.key)).toEqual(['goals'])
  })

  it('cada cifra lleva su detalle: convocatorias, minutos por partido, penaltis, goles + asistencias y tarjetas', () => {
    const cards = statCards(fieldPlayer)

    expect(card(cards, 'matchesPlayed')).toMatchObject({
      label: 'Partidos jugados',
      value: 10,
      note: 'de 11 convocatorias',
    })
    expect(card(cards, 'minutes')).toMatchObject({ label: 'Minutos', value: 312, note: '31 por partido' })
    expect(card(cards, 'goals')).toMatchObject({ label: 'Goles', value: 11, note: '3 de penalti' })
    expect(card(cards, 'assists')).toMatchObject({ label: 'Asistencias', value: 4, note: '15 goles + asist.' })
    expect(card(cards, 'mvps')).toMatchObject({ label: 'MVP', value: 3 })
    expect(card(cards, 'cards')).toMatchObject({ label: 'Tarjetas', yellow: 2, red: 0, note: '2 amarillas · 0 rojas' })
  })

  it('al portero le enseña goles encajados y porterías a cero (destacadas) en lugar de goles y asistencias', () => {
    const cards = statCards({ ...fieldPlayer, position: 'goalkeeper', goalsConceded: 18, cleanSheets: 2 })

    expect(cards.map((c) => c.key)).toEqual([
      'matchesPlayed',
      'minutes',
      'goalsConceded',
      'cleanSheets',
      'mvps',
      'cards',
    ])
    expect(card(cards, 'goalsConceded')).toMatchObject({ label: 'Goles encajados', value: 18 })
    expect(card(cards, 'cleanSheets')).toMatchObject({ label: 'Porterías a cero', value: 2, highlight: true })
  })

  it('sin partidos ni penaltis no inventa detalles, y en singular el texto concuerda', () => {
    const cards = statCards({
      ...fieldPlayer,
      matchesCalled: 1,
      matchesPlayed: 0,
      minutes: 0,
      goals: 1,
      penaltyGoals: 0,
      assists: 0,
      yellowCards: 1,
      redCards: 1,
    })

    expect(card(cards, 'matchesPlayed').note).toBe('de 1 convocatoria')
    expect(card(cards, 'minutes').note).toBeNull()
    expect(card(cards, 'goals').note).toBeNull()
    expect(card(cards, 'assists').note).toBe('1 gol + asist.')
    expect(card(cards, 'cards').note).toBe('1 amarilla · 1 roja')
  })
})

describe('ratingFraction', () => {
  it('lleva la nota (de 1 a 10) a la parte del medidor que se llena', () => {
    expect(ratingFraction(1)).toBe(0)
    expect(ratingFraction(5.5)).toBe(0.5)
    expect(ratingFraction(10)).toBe(1)
  })

  it('sin nota, el medidor queda vacío', () => {
    expect(ratingFraction(null)).toBe(0)
  })
})

describe('ratingRange', () => {
  const point = (rating, cumulativeAvg, teamAvg) => ({ rating, cumulativeAvg, teamAvg })

  it('la escala de la gráfica empieza un punto por debajo de la nota más baja y acaba en 10', () => {
    expect(ratingRange([point(7, 7, 6.8), point(6.5, 6.75, 7.1)])).toEqual({ min: 5, max: 10 })
  })

  it('cuenta también las medias, y nunca baja de 1', () => {
    expect(ratingRange([point(8, 8, 4.2)])).toEqual({ min: 3, max: 10 })
    expect(ratingRange([point(1.5, 1.5, 1)])).toEqual({ min: 1, max: 10 })
  })

  it('sin partidos valorados, la escala entera', () => {
    expect(ratingRange([])).toEqual({ min: 1, max: 10 })
  })
})

describe('isVotingOpen', () => {
  const now = new Date('2026-11-22T12:00:00Z')

  it('está abierta hasta la fecha de cierre que da la base de datos', () => {
    expect(isVotingOpen({ votingClosesAt: new Date('2026-11-29T18:00:00Z') }, now)).toBe(true)
    expect(isVotingOpen({ votingClosesAt: new Date('2026-11-20T18:00:00Z') }, now)).toBe(false)
  })
})

describe('matchSummary', () => {
  const match = { minutes: 36, goals: 0, assists: 0, goalsConceded: null, isMvp: false }

  it('los minutos y, si los hay, goles, asistencias y MVP', () => {
    expect(matchSummary(match)).toBe("36'")
    expect(matchSummary({ ...match, goals: 1 })).toBe("36' · 1 gol")
    expect(matchSummary({ ...match, goals: 2, assists: 1, isMvp: true })).toBe("36' · 2 goles · 1 asist. · MVP")
  })

  it('al portero, los goles encajados o la portería a cero', () => {
    expect(matchSummary({ ...match, minutes: 40, goalsConceded: 1 })).toBe("40' · 1 encajado")
    expect(matchSummary({ ...match, minutes: 40, goalsConceded: 3 })).toBe("40' · 3 encajados")
    expect(matchSummary({ ...match, minutes: 40, goalsConceded: 0 })).toBe("40' · portería a cero")
  })
})

describe('statusLabel', () => {
  it('nombra el estado del jugador', () => {
    expect(statusLabel('available')).toBe('Disponible')
    expect(statusLabel('injured')).toBe('Lesionado')
    expect(statusLabel('suspended')).toBe('Sancionado')
  })
})

it('ofrece los estados del jugador, empezando por «Disponible»', () => {
  expect(STATUS_OPTIONS).toEqual([
    { value: 'available', label: 'Disponible' },
    { value: 'injured', label: 'Lesionado' },
    { value: 'suspended', label: 'Sancionado' },
  ])
})
