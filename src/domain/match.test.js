import { describe, expect, it } from 'vitest'
import {
  COMPETITION_TYPES,
  canHaveResult,
  canLeaveSquad,
  finishBlockers,
  votingAfterFinish,
  GOAL_TYPES,
  PENALTY_TYPES,
  assistOptions,
  goalDetail,
  missingGoals,
  scorerOptions,
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

describe('goles', () => {
  const squad = [
    { playerId: 3, name: 'Checo', called: true, minutes: 30 },
    { playerId: 4, name: 'Navi', called: true, minutes: 0 },
    { playerId: 5, name: 'Javi', called: false, minutes: 0 },
    { playerId: 6, name: 'Dani', called: true, minutes: 12 },
  ]

  it('los tipos de gol y de penalti fallado, como los de la base de datos', () => {
    expect(GOAL_TYPES).toEqual([
      { value: 'regular', label: 'Normal' },
      { value: 'penalty', label: 'Penalti' },
      { value: 'double_penalty', label: 'Doble penalti' },
    ])
    expect(PENALTY_TYPES).toEqual([
      { value: 'penalty', label: 'Penalti' },
      { value: 'double_penalty', label: 'Doble penalti' },
    ])
  })

  it('solo pueden marcar los convocados que jugaron (con minutos)', () => {
    expect(scorerOptions(squad).map((p) => p.name)).toEqual(['Checo', 'Dani'])
  })

  it('el asistente, igual, pero nunca el propio goleador', () => {
    expect(assistOptions(squad, 3).map((p) => p.name)).toEqual(['Dani'])
    expect(assistOptions(squad, null).map((p) => p.name)).toEqual(['Checo', 'Dani'])
  })

  it('el marcador manda: avisa de los goles a favor que faltan por apuntar', () => {
    expect(missingGoals(4, 3)).toBe(1)
    expect(missingGoals(4, 4)).toBe(0)
    expect(missingGoals(null, 2)).toBe(0) // sin resultado no hay nada que comparar
  })

  it('describe cada gol: asistencia, sin asistencia, penalti o doble penalti', () => {
    const nameOf = (id) => ({ 3: 'Checo', 6: 'Dani' })[id]

    expect(goalDetail({ type: 'regular', assistId: 3 }, nameOf)).toBe('Asistencia de Checo')
    expect(goalDetail({ type: 'regular', assistId: null }, nameOf)).toBe('Sin asistencia')
    expect(goalDetail({ type: 'penalty', assistId: null }, nameOf)).toBe('Penalti')
    expect(goalDetail({ type: 'double_penalty', assistId: null }, nameOf)).toBe('Doble penalti')
  })
})

describe('terminar el partido', () => {
  const now = new Date('2026-11-26T12:00:00Z')
  const played = { date: new Date('2026-11-25T17:30:00Z'), goalsFor: 4, playersWithMinutes: 8 }

  it('con resultado, ya jugado y alguien con minutos, se puede terminar', () => {
    expect(finishBlockers(played, now)).toEqual([])
  })

  it('explica todo lo que falta', () => {
    expect(
      finishBlockers({ date: new Date('2026-11-29T17:30:00Z'), goalsFor: null, playersWithMinutes: 0 }, now),
    ).toEqual([
      'Falta el resultado (en «Datos del partido»).',
      'El partido aún no se ha jugado.',
      'Nadie tiene minutos: guarda la convocatoria con los minutos de cada uno.',
    ])
  })

  it('al terminar, la votación queda abierta hasta 7 días después del partido', () => {
    expect(votingAfterFinish(played.date, now)).toEqual({ open: true, closesAt: new Date('2026-12-02T17:30:00Z') })
  })

  it('si ya pasaron 7 días, no habrá votación', () => {
    expect(votingAfterFinish(new Date('2026-11-15T17:30:00Z'), now)).toEqual({ open: false })
  })
})
