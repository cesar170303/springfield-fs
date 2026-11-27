import { describe, expect, it, vi } from 'vitest'
import { createVoteUseCases } from './vote'

const row = (over) => ({
  matchId: 1,
  label: 'J5',
  opponent: 'CD Parla',
  goalsFor: 4,
  goalsAgainst: 2,
  matchDate: new Date('2026-11-25T18:00:00Z'),
  votingClosesAt: new Date('2026-12-02T18:00:00Z'),
  player: { id: 7, name: 'Tito' },
  minutes: 34,
  goals: 0,
  assists: 0,
  goalsConceded: null,
  myScore: null,
  ...over,
})

function setup(rows = []) {
  const voteRepository = {
    getMyOpenVotes: vi.fn().mockResolvedValue(rows),
    castVote: vi.fn().mockResolvedValue(undefined),
  }
  return { voteRepository, useCases: createVoteUseCases({ voteRepository, random: () => 0.999 }) }
}

describe('casos de uso de la votación', () => {
  it('getVoteSession agrupa por partido lo que devuelve el repositorio', async () => {
    const { useCases } = setup([row(), row({ player: { id: 9, name: 'Nano' }, myScore: 7.5 })])

    const [match] = await useCases.getVoteSession()

    expect(match.label).toBe('J5')
    expect(match.pending.map((v) => v.player.name)).toEqual(['Tito'])
    expect(match.voted.map((v) => v.myScore)).toEqual([7.5])
  })

  it('getVoteSession deja fuera los partidos en los que ya no queda nadie por votar', async () => {
    const { useCases } = setup([row({ myScore: 8 })])
    expect(await useCases.getVoteSession()).toEqual([])
  })

  it('castVote envía la nota al repositorio', async () => {
    const { useCases, voteRepository } = setup()
    await useCases.castVote({ matchId: 1, playerId: 7, score: 7.5 })
    expect(voteRepository.castVote).toHaveBeenCalledWith({ matchId: 1, playerId: 7, score: 7.5 })
  })

  it('castVote no envía una nota fuera de la escala', async () => {
    const { useCases, voteRepository } = setup()
    await expect(useCases.castVote({ matchId: 1, playerId: 7, score: null })).rejects.toThrow('Elige una nota')
    await expect(useCases.castVote({ matchId: 1, playerId: 7, score: 7.3 })).rejects.toThrow('Elige una nota')
    expect(voteRepository.castVote).not.toHaveBeenCalled()
  })
})
