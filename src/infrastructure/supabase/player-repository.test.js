import { describe, expect, it, vi } from 'vitest'
import { createSupabasePlayerRepository } from './player-repository'

// Filas tal como las devuelven las RPC (con alguna columna que la app no usa).
const timelineRow = {
  match_id: 5,
  match_date: '2026-10-04T18:00:00+00:00',
  competition_type: 'cup',
  competition_name: 'Copa',
  round: 1,
  opponent: 'Racing Soto',
  label: 'Copa J1',
  rating: 8.5,
  cumulative_avg: 7.88,
  team_avg: 7.2,
}
const logRow = {
  match_id: 9,
  match_date: '2026-11-22T18:00:00+00:00',
  competition_type: 'league',
  label: 'J9',
  opponent: 'Los Rayos',
  minutes: 36,
  goals: 1,
  assists: 0,
  goals_conceded: null,
  rating: null,
  is_mvp: false,
  voting_closes_at: '2026-11-29T18:00:00+00:00',
}

// Cliente falso: solo rpc, con un espía para ver qué se pide.
function setup(result) {
  const rpc = vi.fn().mockResolvedValue(result)
  return { rpc, repository: createSupabasePlayerRepository({ rpc }) }
}

describe('repositorio del jugador de Supabase', () => {
  it('pide la gráfica a get_player_rating_timeline y la traduce', async () => {
    const { repository, rpc } = setup({ data: [timelineRow], error: null })

    expect(await repository.getRatingTimeline({ playerId: 7, seasonId: 2 })).toEqual([
      { matchId: 5, label: 'Copa J1', opponent: 'Racing Soto', rating: 8.5, cumulativeAvg: 7.88, teamAvg: 7.2 },
    ])
    expect(rpc).toHaveBeenCalledWith('get_player_rating_timeline', { p_player_id: 7, p_season_id: 2 })
  })

  it('pide sus partidos a get_player_match_log y los traduce, con fechas de verdad', async () => {
    const { repository, rpc } = setup({ data: [logRow], error: null })

    expect(await repository.getMatchLog({ playerId: 7, seasonId: 2, competitionId: null })).toEqual([
      {
        matchId: 9,
        date: new Date('2026-11-22T18:00:00+00:00'),
        label: 'J9',
        opponent: 'Los Rayos',
        minutes: 36,
        goals: 1,
        assists: 0,
        goalsConceded: null,
        rating: null,
        isMvp: false,
        votingClosesAt: new Date('2026-11-29T18:00:00+00:00'),
      },
    ])
    expect(rpc).toHaveBeenCalledWith('get_player_match_log', {
      p_player_id: 7,
      p_season_id: 2,
      p_competition_id: null,
    })
  })

  it('con la votación cerrada trae la nota y el MVP y, al portero, los goles encajados', async () => {
    const { repository } = setup({ data: [{ ...logRow, rating: 8.5, is_mvp: true, goals_conceded: 2 }], error: null })

    const [match] = await repository.getMatchLog({ playerId: 1, seasonId: 2, competitionId: 1 })

    expect(match).toMatchObject({ rating: 8.5, isMvp: true, goalsConceded: 2 })
  })

  it('si Supabase falla, lanza errores legibles', async () => {
    const { repository } = setup({ data: null, error: { message: 'permission denied' } })

    await expect(repository.getRatingTimeline({ playerId: 7, seasonId: 2 })).rejects.toThrow(
      'No se pudo cargar la gráfica del jugador',
    )
    await expect(repository.getMatchLog({ playerId: 7, seasonId: 2, competitionId: null })).rejects.toThrow(
      'No se pudieron cargar los partidos del jugador',
    )
  })
})
