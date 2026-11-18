-- Totales calculados por las RPC: get_squad_stats, get_player_rating_timeline y get_season_mvps.
begin;
\ir ../helpers.psql
select no_plan();

select pg_temp.keep('season', pg_temp.create_season('TEST 06')::text);
select pg_temp.keep('league', pg_temp.create_competition('TEST 06 Liga', 'league')::text);
select pg_temp.keep('cup', pg_temp.create_competition('TEST 06 Copa', 'cup')::text);
select pg_temp.keep('gk', pg_temp.create_player(pg_temp.id('season'), 'GK06', 1, 'goalkeeper')::text);
select pg_temp.keep('a', pg_temp.create_player(pg_temp.id('season'), 'A06', 7)::text);
select pg_temp.keep('b', pg_temp.create_player(pg_temp.id('season'), 'B06', 9)::text);
select pg_temp.keep('c', pg_temp.create_player(pg_temp.id('season'), 'C06', 11)::text);

-- J1 de liga (cerrada): 3-1. A marca 2 (uno de penalti), B asiste y marca 1. A ve amarilla.
select pg_temp.keep('m1', pg_temp.create_match(pg_temp.id('season'), pg_temp.id('league'), 1, now() - interval '20 days', 3, 1, true)::text);
select pg_temp.play(pg_temp.id('m1'), pg_temp.id('gk'), 40);
select pg_temp.play(pg_temp.id('m1'), pg_temp.id('a'), 40, true);
select pg_temp.play(pg_temp.id('m1'), pg_temp.id('b'), 30);
select pg_temp.play(pg_temp.id('m1'), pg_temp.id('c'), 0);
insert into public.goals (match_id, scorer_id, assist_id) values (pg_temp.id('m1'), pg_temp.id('a'), pg_temp.id('b'));
insert into public.goals (match_id, scorer_id, type) values (pg_temp.id('m1'), pg_temp.id('a'), 'penalty');
insert into public.goals (match_id, scorer_id) values (pg_temp.id('m1'), pg_temp.id('b'));
insert into public.missed_penalties (match_id, player_id, type) values (pg_temp.id('m1'), pg_temp.id('b'), 'penalty');
-- Notas J1: A 8 y 9 (8,5), B 6, GK 7. MVP: A.
select pg_temp.add_vote(pg_temp.id('m1'), pg_temp.user_of(pg_temp.id('b')), pg_temp.id('a'), 8);
select pg_temp.add_vote(pg_temp.id('m1'), pg_temp.user_of(pg_temp.id('gk')), pg_temp.id('a'), 9);
select pg_temp.add_vote(pg_temp.id('m1'), pg_temp.user_of(pg_temp.id('a')), pg_temp.id('b'), 6);
select pg_temp.add_vote(pg_temp.id('m1'), pg_temp.user_of(pg_temp.id('a')), pg_temp.id('gk'), 7);

-- J1 de copa (cerrada): 1-0. B marca; portería a cero. C juega y ve roja.
select pg_temp.keep('m2', pg_temp.create_match(pg_temp.id('season'), pg_temp.id('cup'), 1, now() - interval '10 days', 1, 0, true)::text);
select pg_temp.play(pg_temp.id('m2'), pg_temp.id('gk'), 40);
select pg_temp.play(pg_temp.id('m2'), pg_temp.id('b'), 40);
select pg_temp.play(pg_temp.id('m2'), pg_temp.id('c'), 10, false, true);
insert into public.goals (match_id, scorer_id) values (pg_temp.id('m2'), pg_temp.id('b'));
-- Notas copa: B 7 y GK 7 empatan → el admin debe desempatar.
select pg_temp.add_vote(pg_temp.id('m2'), pg_temp.user_of(pg_temp.id('c')), pg_temp.id('b'), 7);
select pg_temp.add_vote(pg_temp.id('m2'), pg_temp.user_of(pg_temp.id('c')), pg_temp.id('gk'), 7);

-- J2 de liga sin jugar: no cuenta.
select pg_temp.create_match(pg_temp.id('season'), pg_temp.id('league'), 2, now() + interval '3 days');

-- C deja el equipo: se archiva pero conserva su historial.
update public.players set archived_at = now() where id = pg_temp.id('c');

select pg_temp.act_as(pg_temp.user_of(pg_temp.id('a')));
create temp table all_stats as select * from public.get_squad_stats(current_setting('t.season')::bigint, null);
create temp table cup_stats as select * from public.get_squad_stats(current_setting('t.season')::bigint, current_setting('t.cup')::bigint);
create temp table mvps as select * from public.get_season_mvps(current_setting('t.season')::bigint);
create temp table a_timeline as select * from public.get_player_rating_timeline(current_setting('t.a')::bigint, current_setting('t.season')::bigint);
create temp table b_timeline as select * from public.get_player_rating_timeline(current_setting('t.b')::bigint, current_setting('t.season')::bigint);
reset role;

-- Lista completa (todas las competiciones), ordenada por dorsal
select results_eq($$ select shirt_number::int from all_stats $$, array[1, 7, 9, 11], 'la lista sale ordenada por dorsal');
select results_eq($$ select matches_called, matches_played, minutes, goals, assists, penalty_goals, yellow_cards, red_cards
                     from all_stats where player_id = pg_temp.id('a') $$,
                  $$ values (1::bigint, 1::bigint, 40::bigint, 2::bigint, 0::bigint, 1::bigint, 1::bigint, 0::bigint) $$,
                  'A: totales de la temporada');
select results_eq($$ select matches_played, minutes, goals, assists, penalties_missed from all_stats where player_id = pg_temp.id('b') $$,
                  $$ values (2::bigint, 70::bigint, 2::bigint, 1::bigint, 1::bigint) $$,
                  'B: suma liga y copa');
select results_eq($$ select matches_called, matches_played, red_cards, is_archived from all_stats where player_id = pg_temp.id('c') $$,
                  $$ values (2::bigint, 1::bigint, 1::bigint, true) $$,
                  'C: convocado 2, juega 1 (0 minutos no cuenta como PJ), archivado con historial');
select results_eq($$ select goals_conceded, clean_sheets from all_stats where player_id = pg_temp.id('gk') $$,
                  $$ values (1::bigint, 1::bigint) $$, 'portero: goles encajados y porterías a cero');
select is((select goals_conceded from all_stats where player_id = pg_temp.id('a')), null::bigint,
          'los jugadores de campo no tienen goles encajados');

-- Medias y MVP
select is((select avg_rating from all_stats where player_id = pg_temp.id('a')), 8.50, 'A: media 8,5');
select is((select rated_matches from all_stats where player_id = pg_temp.id('b')), 2::bigint, 'B: 2 partidos valorados');
select is((select avg_rating from all_stats where player_id = pg_temp.id('b')), 6.50, 'B: cada partido pesa lo mismo (6 y 7)');
select is((select mvps from all_stats where player_id = pg_temp.id('a')), 1::bigint, 'A: 1 MVP');
select results_eq($$ select player_id, needs_tiebreak from mvps order by match_id $$,
                  $$ values (pg_temp.id('a'), false), (null::bigint, true) $$,
                  'J1 tiene MVP; en copa hay empate y se pide desempate');

-- Filtro por competición
select results_eq($$ select goals, matches_played from cup_stats where player_id = pg_temp.id('b') $$,
                  $$ values (1::bigint, 1::bigint) $$, 'filtro copa: solo cuenta la copa');
select is((select goals from cup_stats where player_id = pg_temp.id('a')), 0::bigint, 'filtro copa: A no marcó en copa');

-- Gráfica
select results_eq($$ select label, rating, cumulative_avg from b_timeline $$,
                  $$ values ('J1', 6.00, 6.00), ('Copa J1', 7.00, 6.50) $$,
                  'gráfica de B: nota por partido, media acumulada y etiqueta Copa');
select is((select team_avg from a_timeline), 7.17, 'gráfica: media del equipo en el partido ((8,5 + 6 + 7) / 3)');

-- Desempate del admin
update public.matches set mvp_override_player_id = pg_temp.id('gk') where id = pg_temp.id('m2');
select results_eq(format('select player_id, needs_tiebreak from public.get_season_mvps(%s) where match_id = %s',
                         current_setting('t.season'), current_setting('t.m2')),
                  $$ values (pg_temp.id('gk'), false) $$, 'el desempate del admin decide el MVP');

select * from finish();
rollback;
