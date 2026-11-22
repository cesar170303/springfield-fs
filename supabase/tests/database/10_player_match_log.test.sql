-- Historial de partidos de un jugador para su ficha: get_player_match_log.
begin;
\ir ../helpers.psql
select no_plan();

select pg_temp.keep('season', pg_temp.create_season('TEST 10')::text);
select pg_temp.keep('league', pg_temp.create_competition('TEST 10 Liga', 'league')::text);
select pg_temp.keep('cup', pg_temp.create_competition('TEST 10 Copa', 'cup')::text);
select pg_temp.keep('gk', pg_temp.create_player(pg_temp.id('season'), 'GK10', 1, 'goalkeeper')::text);
select pg_temp.keep('a', pg_temp.create_player(pg_temp.id('season'), 'A10', 7)::text);
select pg_temp.keep('b', pg_temp.create_player(pg_temp.id('season'), 'B10', 9)::text);

-- J1 de liga, cerrada (hace 20 días): 3-1. A juega 40' y marca 2 (B asiste uno). Notas de A: 8 y 9 → 8,5 (MVP).
select pg_temp.keep('m1', pg_temp.create_match(pg_temp.id('season'), pg_temp.id('league'), 1, now() - interval '20 days', 3, 1, true)::text);
select pg_temp.play(pg_temp.id('m1'), pg_temp.id('gk'), 40);
select pg_temp.play(pg_temp.id('m1'), pg_temp.id('a'), 40);
select pg_temp.play(pg_temp.id('m1'), pg_temp.id('b'), 30);
insert into public.goals (match_id, scorer_id, assist_id) values (pg_temp.id('m1'), pg_temp.id('a'), pg_temp.id('b'));
insert into public.goals (match_id, scorer_id) values (pg_temp.id('m1'), pg_temp.id('a'));
select pg_temp.add_vote(pg_temp.id('m1'), pg_temp.user_of(pg_temp.id('b')), pg_temp.id('a'), 8);
select pg_temp.add_vote(pg_temp.id('m1'), pg_temp.user_of(pg_temp.id('gk')), pg_temp.id('a'), 9);
select pg_temp.add_vote(pg_temp.id('m1'), pg_temp.user_of(pg_temp.id('a')), pg_temp.id('b'), 6);

-- J1 de copa, cerrada (hace 10 días): 1-0. A juega 25' y asiste a B. Nota de A: 7. MVP: B (7,5).
select pg_temp.keep('m2', pg_temp.create_match(pg_temp.id('season'), pg_temp.id('cup'), 1, now() - interval '10 days', 1, 0, true)::text);
select pg_temp.play(pg_temp.id('m2'), pg_temp.id('gk'), 40);
select pg_temp.play(pg_temp.id('m2'), pg_temp.id('a'), 25);
select pg_temp.play(pg_temp.id('m2'), pg_temp.id('b'), 40);
insert into public.goals (match_id, scorer_id, assist_id) values (pg_temp.id('m2'), pg_temp.id('b'), pg_temp.id('a'));
select pg_temp.add_vote(pg_temp.id('m2'), pg_temp.user_of(pg_temp.id('b')), pg_temp.id('a'), 7);
select pg_temp.add_vote(pg_temp.id('m2'), pg_temp.user_of(pg_temp.id('a')), pg_temp.id('b'), 7.5);

-- J2 de liga, terminada hace 2 días: votación abierta. A juega 36' y marca. Ya tiene un voto, que no se puede ver.
select pg_temp.keep('m3', pg_temp.create_match(pg_temp.id('season'), pg_temp.id('league'), 2, now() - interval '2 days', 2, 2, true)::text);
select pg_temp.play(pg_temp.id('m3'), pg_temp.id('gk'), 40);
select pg_temp.play(pg_temp.id('m3'), pg_temp.id('a'), 36);
insert into public.goals (match_id, scorer_id) values (pg_temp.id('m3'), pg_temp.id('a'));
select pg_temp.add_vote(pg_temp.id('m3'), pg_temp.user_of(pg_temp.id('b')), pg_temp.id('a'), 9);

-- J3 de liga, terminada ayer: A convocado sin jugar (0 minutos) → no aparece en su historial.
select pg_temp.keep('m4', pg_temp.create_match(pg_temp.id('season'), pg_temp.id('league'), 3, now() - interval '1 day', 0, 1, true)::text);
select pg_temp.play(pg_temp.id('m4'), pg_temp.id('gk'), 40);
select pg_temp.play(pg_temp.id('m4'), pg_temp.id('a'), 0);

-- J4 de liga sin jugar: no aparece.
select pg_temp.create_match(pg_temp.id('season'), pg_temp.id('league'), 4, now() + interval '3 days');

-- Cualquier registrado puede ver el historial de cualquier jugador (aquí B mira el de A).
select pg_temp.act_as(pg_temp.user_of(pg_temp.id('b')));
create temp table a_log as
  select * from public.get_player_match_log(current_setting('t.a')::bigint, current_setting('t.season')::bigint);
create temp table a_cup as
  select * from public.get_player_match_log(current_setting('t.a')::bigint, current_setting('t.season')::bigint,
                                            current_setting('t.cup')::bigint);
create temp table gk_log as
  select * from public.get_player_match_log(current_setting('t.gk')::bigint, current_setting('t.season')::bigint);
reset role;

select results_eq($$ select label from a_log $$, array['J2', 'Copa J1', 'J1'],
                  'solo los partidos terminados en los que jugó (al menos 1 minuto), del más reciente al más antiguo');
select results_eq($$ select opponent, minutes, goals, assists from a_log order by match_date $$,
                  $$ values ('Rival 1', 40, 2::bigint, 0::bigint), ('Rival 1', 25, 0::bigint, 1::bigint),
                            ('Rival 2', 36, 1::bigint, 0::bigint) $$,
                  'rival, minutos, goles y asistencias de cada partido');
select results_eq($$ select rating, is_mvp from a_log order by match_date $$,
                  $$ values (8.50, true), (7.00, false), (null::numeric, false) $$,
                  'nota y MVP solo de las votaciones cerradas: con la votación abierta no se ve el voto que ya hay');
select is((select voting_closes_at from a_log where label = 'J2'),
          (select match_date + interval '7 days' from public.matches where id = pg_temp.id('m3')),
          'la votación cierra 7 días después del partido');
select results_eq($$ select label from a_cup $$, array['Copa J1'], 'filtro por competición');
select results_eq($$ select goals_conceded from gk_log order by match_date $$, array[1, 0, 2, 1],
                  'al portero, los goles encajados de cada partido');
select is((select count(*) from a_log where goals_conceded is not null), 0::bigint,
          'a un jugador de campo no se le dan goles encajados');

-- Sin sesión no se puede llamar.
select pg_temp.act_as_anon();
select throws_ok(format('select * from public.get_player_match_log(%s, %s)', current_setting('t.a'), current_setting('t.season')),
                 '42501', null, 'sin sesión no se puede leer el historial');
reset role;

select * from finish();
rollback;
