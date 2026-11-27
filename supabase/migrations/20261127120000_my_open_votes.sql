-- Pantalla de votación (docs/SPEC.md §6): a quién puede votar la cuenta actual ahora mismo.
-- Una fila por compañero votable en cada partido con la votación abierta, con sus datos de ese partido y
-- `my_score`, la nota que esta cuenta ya le puso (null = pendiente).
-- security invoker: lee solo lo que la cuenta ya puede leer; de `votes`, RLS deja ver solo los votos propios.
-- La regla de quién vota a quién es la misma que la del insert: rls.can_vote.
create function public.get_my_open_votes()
returns table (
  match_id         bigint,
  match_date       timestamptz,
  label            text,          -- 'J5', 'Copa J2', 'Amistoso J1' (como en la ficha)
  opponent         text,
  goals_for        int,
  goals_against    int,
  voting_closes_at timestamptz,   -- 7 días después del partido
  player_id        bigint,
  nickname         text,
  first_name       text,
  player_position  public.player_position,
  photo_path       text,
  shirt_number     int,
  minutes          int,
  goals            bigint,
  assists          bigint,
  goals_conceded   int,           -- solo porteros
  my_score         numeric        -- null = aún no le has votado
)
language sql stable security invoker set search_path = ''
as $$
  select m.id,
         m.match_date,
         case c.type
           when 'league' then 'J' || m.round
           when 'cup'    then 'Copa J' || m.round
           else               'Amistoso J' || m.round
         end,
         m.opponent,
         m.goals_for::int,
         m.goals_against::int,
         m.match_date + interval '7 days',
         p.id,
         p.nickname,
         p.first_name,
         p.position,
         p.photo_path,
         ps.shirt_number::int,
         ms.minutes::int,
         (select count(*) from public.goals g where g.match_id = m.id and g.scorer_id = p.id),
         (select count(*) from public.goals g where g.match_id = m.id and g.assist_id = p.id),
         case when p.position = 'goalkeeper' then m.goals_against::int end,
         v.score
  from public.matches m
  join public.competitions c   on c.id = m.competition_id
  join public.match_squad ms   on ms.match_id = m.id and ms.minutes > 0
  join public.players p        on p.id = ms.player_id
  left join public.player_seasons ps on ps.player_id = p.id and ps.season_id = m.season_id
  left join public.votes v     on v.match_id = m.id and v.rated_id = p.id and v.voter_id = (select auth.uid())
  where m.is_finished
    and now() < m.match_date + interval '7 days'
    and rls.can_vote(m.id, (select auth.uid()), p.id)
  order by m.match_date + interval '7 days', p.id;
$$;

revoke execute on function public.get_my_open_votes() from public, anon;
grant  execute on function public.get_my_open_votes() to authenticated;
