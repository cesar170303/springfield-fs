import { describe, expect, it, vi } from 'vitest'
import { createSupabaseVoteRepository } from './vote-repository'

// Fila tal como la devuelve get_my_open_votes.
const row = {
  match_id: 3,
  match_date: '2026-11-25T18:00:00+00:00',
  label: 'J5',
  opponent: 'CD Parla',
  goals_for: 4,
  goals_against: 2,
  voting_closes_at: '2026-12-02T18:00:00+00:00',
  player_id: 7,
  nickname: 'Tito',
  first_name: 'Alberto',
  player_position: 'winger',
  photo_path: 'tito.webp',
  shirt_number: 7,
  minutes: 34,
  goals: 2,
  assists: 1,
  goals_conceded: null,
  my_score: '8.0',
}

function setup({ rpcResult = { data: [row], error: null }, insertResult = { error: null } } = {}) {
  const insert = vi.fn().mockResolvedValue(insertResult)
  const client = {
    rpc: vi.fn().mockResolvedValue(rpcResult),
    from: vi.fn(() => ({ insert })),
    storage: { from: () => ({ getPublicUrl: (path) => ({ data: { publicUrl: `https://fotos/${path}` } }) }) },
  }
  return { client, insert, repository: createSupabaseVoteRepository(client) }
}

describe('repositorio de votos de Supabase', () => {
  it('pide a get_my_open_votes lo que puedo votar y lo traduce', async () => {
    const { repository, client } = setup()

    expect(await repository.getMyOpenVotes()).toEqual([
      {
        matchId: 3,
        matchDate: new Date('2026-11-25T18:00:00Z'),
        label: 'J5',
        opponent: 'CD Parla',
        goalsFor: 4,
        goalsAgainst: 2,
        votingClosesAt: new Date('2026-12-02T18:00:00Z'),
        player: { id: 7, name: 'Tito', position: 'winger', photoUrl: 'https://fotos/tito.webp', shirtNumber: 7 },
        minutes: 34,
        goals: 2,
        assists: 1,
        goalsConceded: null,
        myScore: 8,
      },
    ])
    expect(client.rpc).toHaveBeenCalledWith('get_my_open_votes')
  })

  it('sin foto ni nota, null', async () => {
    const { repository } = setup({ rpcResult: { data: [{ ...row, photo_path: null, my_score: null }], error: null } })
    const [vote] = await repository.getMyOpenVotes()
    expect(vote.player.photoUrl).toBeNull()
    expect(vote.myScore).toBeNull()
  })

  it('nunca lee la tabla votes: las notas propias llegan por la RPC', async () => {
    const { repository, client } = setup()
    await repository.getMyOpenVotes()
    expect(client.from).not.toHaveBeenCalled()
  })

  it('si la RPC falla, lanza un error legible', async () => {
    const { repository } = setup({ rpcResult: { data: null, error: { message: 'boom' } } })
    await expect(repository.getMyOpenVotes()).rejects.toThrow('No se pudo cargar la votación')
  })

  it('castVote inserta el voto sin votante: lo pone la base de datos (auth.uid())', async () => {
    const { repository, client, insert } = setup()
    await repository.castVote({ matchId: 3, playerId: 7, score: 7.5 })
    expect(client.from).toHaveBeenCalledWith('votes')
    expect(insert).toHaveBeenCalledWith({ match_id: 3, rated_id: 7, score: 7.5 })
  })

  it('castVote explica un voto repetido o una votación ya cerrada', async () => {
    const repeated = setup({ insertResult: { error: { code: '23505', message: 'duplicate key value violates unique constraint "votes_pkey"' } } })
    await expect(repeated.repository.castVote({ matchId: 3, playerId: 7, score: 8 })).rejects.toThrow('Ya le habías votado')

    const closed = setup({ insertResult: { error: { code: '42501', message: 'new row violates row-level security policy' } } })
    await expect(closed.repository.castVote({ matchId: 3, playerId: 7, score: 8 })).rejects.toThrow(
      'La votación de este partido ya está cerrada',
    )
  })
})
