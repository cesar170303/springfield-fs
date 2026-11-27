import { describe, expect, it } from 'vitest'
import { formatScore, groupVoteMatches, isValidScore, skipFirst, voteStats } from './vote'

const vote = (over) => ({
  matchId: 1,
  label: 'J5',
  opponent: 'CD Parla',
  goalsFor: 4,
  goalsAgainst: 2,
  matchDate: new Date('2026-11-25T18:00:00Z'),
  votingClosesAt: new Date('2026-12-02T18:00:00Z'),
  player: { id: 7, name: 'Tito', position: 'winger', photoUrl: null, shirtNumber: 7 },
  minutes: 34,
  goals: 2,
  assists: 1,
  goalsConceded: null,
  myScore: null,
  ...over,
})

describe('formatScore', () => {
  it('escribe la nota con coma, sin decimales si es entera, y una raya sin nota', () => {
    expect(formatScore(7.5)).toBe('7,5')
    expect(formatScore(8)).toBe('8')
    expect(formatScore(null)).toBe('—')
  })
})

describe('isValidScore', () => {
  it('acepta de 1 a 10 en medios puntos y nada más', () => {
    expect([1, 5.5, 10].every(isValidScore)).toBe(true)
    expect([null, 0.5, 10.5, 7.3, '8'].some(isValidScore)).toBe(false)
  })
})

describe('voteStats', () => {
  it('los minutos siempre y los goles y asistencias solo si los hay', () => {
    expect(voteStats(vote())).toEqual([
      { value: 34, unit: 'min' },
      { value: 2, unit: 'goles' },
      { value: 1, unit: 'asist.' },
    ])
    expect(voteStats(vote({ goals: 1, assists: 0 }))).toEqual([
      { value: 34, unit: 'min' },
      { value: 1, unit: 'gol' },
    ])
  })

  it('al portero, los encajados aunque sean cero', () => {
    expect(voteStats(vote({ goals: 0, assists: 0, goalsConceded: 0, minutes: 40 }))).toEqual([
      { value: 40, unit: 'min' },
      { value: 0, unit: 'encajados' },
    ])
    expect(voteStats(vote({ goals: 0, assists: 0, goalsConceded: 1 }))[1]).toEqual({ value: 1, unit: 'encajado' })
  })
})

describe('groupVoteMatches', () => {
  // random que siempre da 0: el barajado (Fisher-Yates) queda determinado y se puede comprobar.
  const zero = () => 0

  it('un grupo por partido, del que cierra antes al último, con pendientes y ya votados aparte', () => {
    const late = { matchId: 2, label: 'Copa J2', votingClosesAt: new Date('2026-12-04T18:00:00Z') }
    const groups = groupVoteMatches(
      [
        vote({ ...late, player: { id: 9, name: 'Nano' } }),
        vote({ player: { id: 7, name: 'Tito' }, myScore: 8 }),
        vote({ player: { id: 4, name: 'Chema' } }),
      ],
      zero,
    )

    expect(groups.map((g) => g.label)).toEqual(['J5', 'Copa J2'])
    expect(groups[0]).toMatchObject({ matchId: 1, opponent: 'CD Parla', goalsFor: 4, goalsAgainst: 2 })
    expect(groups[0].pending.map((v) => v.player.name)).toEqual(['Chema'])
    expect(groups[0].voted.map((v) => [v.player.name, v.myScore])).toEqual([['Tito', 8]])
    expect(groups[1].pending.map((v) => v.player.name)).toEqual(['Nano'])
  })

  it('baraja los pendientes con el azar que recibe', () => {
    const rows = [1, 2, 3].map((id) => vote({ player: { id, name: `P${id}` } }))
    // Con random 0, Fisher-Yates cambia cada posición por la primera: [1,2,3] → [2,3,1].
    expect(groupVoteMatches(rows, zero)[0].pending.map((v) => v.player.id)).toEqual([2, 3, 1])
    // Con random casi 1, nada cambia de sitio.
    expect(groupVoteMatches(rows, () => 0.999)[0].pending.map((v) => v.player.id)).toEqual([1, 2, 3])
  })

  it('no toca la lista que recibe', () => {
    const rows = [vote({ player: { id: 1 } }), vote({ player: { id: 2 } })]
    groupVoteMatches(rows, zero)
    expect(rows.map((v) => v.player.id)).toEqual([1, 2])
  })
})

describe('skipFirst', () => {
  it('el primero pasa al final', () => {
    expect(skipFirst(['a', 'b', 'c'])).toEqual(['a', 'b', 'c'].slice(1).concat('a'))
  })

  it('si solo queda uno, no se puede saltar: null', () => {
    expect(skipFirst(['a'])).toBeNull()
  })
})
