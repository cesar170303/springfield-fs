-- Historial de partidos de un jugador para su ficha (docs/SPEC.md §7, «Últimos partidos»).
-- Un registro por partido terminado en el que jugó al menos 1 minuto, del más reciente al más antiguo.
-- La nota y el MVP salen de private.match_ratings y private.match_mvp, que solo tienen votaciones cerradas:
-- con la votación abierta, `rating` es null e `is_mvp` es false, aunque ya haya votos (anonimato, §6).
create or replace function public.get_player_match_log(
  p_player_id      bigint,
  p_season_id      bigint,
  p_competition_id bigint default null   -- null = todas las competiciones
)
returns table (
  match_id         bigint,
  match_date       timestamptz,
  competition_type public.competition_type,
  label            text,          -- 'J5', 'Copa J2', 'Amistoso J1' (como en la gráfica)
  opponent         text,
  minutes          int,
  goals            bigint,
  assists          bigint,
  goals_conceded   int,           -- solo porteros
  rating           numeric,       -- null mientras la votación está abierta
  is_mvp           boolean,
  voting_closes_at timestamptz    -- 7 días después del partido
)
language sql stable security definer set search_path = ''
as $$
  select m.id,
         m.match_date,
         c.type,
         case c.type
           when 'league' then 'J' || m.round
           when 'cup'    then 'Copa J' || m.round
           else               'Amistoso J' || m.round
         end,
         m.opponent,
         ms.minutes::int,
         (select count(*) from public.goals g where g.match_id = m.id and g.scorer_id = p_player_id),
         (select count(*) from public.goals g where g.match_id = m.id and g.assist_id = p_player_id),
         case when p.position = 'goalkeeper' then m.goals_against::int end,
         round(r.rating, 2),
         coalesce(mv.player_id = p_player_id, false),
         m.match_date + interval '7 days'
  from public.match_squad ms
  join public.matches m      on m.id = ms.match_id
  join public.competitions c on c.id = m.competition_id
  join public.players p      on p.id = ms.player_id
  left join private.match_ratings r on r.match_id = m.id and r.player_id = ms.player_id
  left join private.match_mvp mv    on mv.match_id = m.id
  where ms.player_id = p_player_id
    and ms.minutes > 0
    and m.season_id = p_season_id
    and m.is_finished
    and (p_competition_id is null or m.competition_id = p_competition_id)
  order by m.match_date desc;
$$;

-- Solo usuarios registrados, como el resto de las RPC de estadísticas.
revoke execute on function public.get_player_match_log(bigint, bigint, bigint) from public, anon;
grant  execute on function public.get_player_match_log(bigint, bigint, bigint) to authenticated;
