import { describe, expect, it } from 'vitest'
import {
  COMPETITION_TYPES,
  canHaveResult,
  canLeaveSquad,
  competitionTypeLabel,
  matchLabel,
  matchState,
  nextRound,
  votingClosesAt,
} from './match'

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

describe('matchLabel', () => {
  it('como en la gráfica y el historial: J5, Copa J2, Amistoso J1', () => {
    expect(matchLabel('league', 5)).toBe('J5')
    expect(matchLabel('cup', 2)).toBe('Copa J2')
    expect(matchLabel('friendly', 1)).toBe('Amistoso J1')
  })
})

describe('votingClosesAt', () => {
  it('la votación se cierra 7 días después del partido', () => {
    expect(votingClosesAt(new Date('2026-11-22T17:30:00Z'))).toEqual(new Date('2026-11-29T17:30:00Z'))
  })
})

describe('matchState', () => {
  const now = new Date('2026-11-26T12:00:00Z')
  const match = (date, isFinished = false) => ({ date: new Date(date), isFinished })

  it('sin terminar: por jugar si aún no ha llegado su fecha; por terminar si ya pasó', () => {
    expect(matchState(match('2026-11-29T17:30:00Z'), now)).toEqual({ key: 'upcoming' })
    expect(matchState(match('2026-11-22T17:30:00Z'), now)).toEqual({ key: 'unfinished' })
  })

  it('terminado: votación abierta hasta 7 días después; luego, cerrada', () => {
    expect(matchState(match('2026-11-22T17:30:00Z', true), now)).toEqual({
      key: 'voting',
      closesAt: new Date('2026-11-29T17:30:00Z'),
    })
    expect(matchState(match('2026-11-15T17:30:00Z', true), now)).toEqual({ key: 'closed' })
  })
})

describe('nextRound', () => {
  const matches = [
    { competitionId: 1, round: 5 },
    { competitionId: 1, round: 7 },
    { competitionId: 2, round: 2 },
  ]

  it('propone la siguiente a la última jornada de esa competición', () => {
    expect(nextRound(matches, 1)).toBe(8)
    expect(nextRound(matches, 2)).toBe(3)
  })

  it('en una competición sin partidos, la 1', () => {
    expect(nextRound(matches, 3)).toBe(1)
  })
})

describe('canHaveResult', () => {
  const now = new Date('2026-11-26T12:00:00Z')

  it('un partido que ya se ha jugado (o empieza ahora) puede tener resultado', () => {
    expect(canHaveResult(new Date('2026-11-22T17:30:00Z'), now)).toBe(true)
    expect(canHaveResult(now, now)).toBe(true)
  })

  it('uno que aún no se ha jugado, no', () => {
    expect(canHaveResult(new Date('2026-11-29T17:30:00Z'), now)).toBe(false)
  })
})

describe('canLeaveSquad', () => {
  const events = {
    goals: [
      { scorerId: 3, assistId: 7 },
      { scorerId: 9, assistId: null },
    ],
    missedPenalties: [{ playerId: 11 }],
  }

  it('quien no tiene goles, asistencias ni penaltis apuntados se puede quitar de la convocatoria', () => {
    expect(canLeaveSquad(4, events)).toBe(true)
  })

  it('quien marcó, asistió o falló un penalti, no (habría que borrar antes eso)', () => {
    expect(canLeaveSquad(3, events)).toBe(false)
    expect(canLeaveSquad(7, events)).toBe(false)
    expect(canLeaveSquad(11, events)).toBe(false)
  })
})
