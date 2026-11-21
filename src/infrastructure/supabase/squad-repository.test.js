import { describe, expect, it, vi } from 'vitest'
import { createSupabaseSquadRepository } from './squad-repository'

// Fila tal como la devuelve get_squad_stats (solo las columnas que usa la app y alguna de más).
const row = {
  player_id: 7,
  first_name: 'Luis',
  last_name: 'Pérez',
  nickname: 'Chino',
  shirt_number: 10,
  position: 'winger',
  photo_path: 'players/7.webp',
  matches_played: 12,
  minutes: 480,
  goals: 11,
  assists: 4,
  yellow_cards: 1,
  red_cards: 0,
  avg_rating: 8.27,
  mvps: 5,
  goals_conceded: 0,
}

// Cliente falso: rpc, from().select().order() y storage.from().getPublicUrl(), con espías para ver qué se pide.
function setup({ rpcResult = { data: [row], error: null }, tableRows = [] } = {}) {
  const rpc = vi.fn().mockResolvedValue(rpcResult)
  const order = vi.fn().mockResolvedValue({ data: tableRows, error: null })
  const select = vi.fn().mockReturnValue({ order })
  const from = vi.fn().mockReturnValue({ select })
  const storage = { from: () => ({ getPublicUrl: (path) => ({ data: { publicUrl: `https://cdn.test/${path}` } }) }) }
  return { rpc, from, select, order, repository: createSupabaseSquadRepository({ rpc, from, storage }) }
}

describe('repositorio de la plantilla de Supabase', () => {
  it('pide get_squad_stats con la temporada y la competición y traduce cada fila', async () => {
    const { repository, rpc } = setup()

    expect(await repository.getSquadStats({ seasonId: 2, competitionId: null })).toEqual([
      {
        id: 7,
        name: 'Chino',
        shirtNumber: 10,
        position: 'winger',
        photoUrl: 'https://cdn.test/players/7.webp',
        matchesPlayed: 12,
        goals: 11,
        assists: 4,
        yellowCards: 1,
        redCards: 0,
        avgRating: 8.27,
        mvps: 5,
        goalsConceded: 0,
      },
    ])
    expect(rpc).toHaveBeenCalledWith('get_squad_stats', { p_season_id: 2, p_competition_id: null })
  })

  it('sin foto, sin apodo o sin nota, lo deja claro', async () => {
    const { repository } = setup({
      rpcResult: { data: [{ ...row, photo_path: null, nickname: null, avg_rating: null }], error: null },
    })

    const [player] = await repository.getSquadStats({ seasonId: 2, competitionId: 1 })

    expect(player).toMatchObject({ name: 'Luis', photoUrl: null, avgRating: null })
  })

  it('si Supabase falla, lanza un error con un mensaje legible', async () => {
    const { repository } = setup({ rpcResult: { data: null, error: { message: 'permission denied' } } })

    await expect(repository.getSquadStats({ seasonId: 2, competitionId: null })).rejects.toThrow(
      'No se pudo cargar la plantilla',
    )
  })

  it('da las temporadas de la más reciente a la más antigua', async () => {
    const { repository, from, select, order } = setup({
      tableRows: [{ id: 2, name: '2026/27', is_current: true }],
    })

    expect(await repository.getSeasons()).toEqual([{ id: 2, name: '2026/27', isCurrent: true }])
    expect(from).toHaveBeenCalledWith('seasons')
    expect(select).toHaveBeenCalledWith('id, name, is_current')
    expect(order).toHaveBeenCalledWith('start_date', { ascending: false })
  })

  it('da las competiciones', async () => {
    const { repository, from, select } = setup({ tableRows: [{ id: 1, name: 'Liga' }] })

    expect(await repository.getCompetitions()).toEqual([{ id: 1, name: 'Liga' }])
    expect(from).toHaveBeenCalledWith('competitions')
    expect(select).toHaveBeenCalledWith('id, name')
  })
})
