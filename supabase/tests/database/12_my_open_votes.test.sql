-- Pantalla de votación: get_my_open_votes (docs/SPEC.md §6, «Pantalla de votación»).
begin;
\ir ../helpers.psql
select no_plan();

select pg_temp.keep('season', pg_temp.create_season('TEST 12')::text);
select pg_temp.keep('league', pg_temp.create_competition('TEST 12 Liga', 'league')::text);
select pg_temp.keep('cup', pg_temp.create_competition('TEST 12 Copa', 'cup')::text);
select pg_temp.keep('gk', pg_temp.create_player(pg_temp.id('season'), 'GK12', 1, 'goalkeeper')::text);
select pg_temp.keep('a', pg_temp.create_player(pg_temp.id('season'), 'A12', 7)::text);
select pg_temp.keep('b', pg_temp.create_player(pg_temp.id('season'), 'B12', 9)::text);
select pg_temp.keep('c', pg_temp.create_player(pg_temp.id('season'), 'C12', 4)::text);
select pg_temp.keep('fan', pg_temp.create_user('fan12@example.com')::text);
select pg_temp.keep('other', pg_temp.create_user('other12@example.com')::text);
insert into public.season_voters (season_id, user_id) values (pg_temp.id('season'), pg_temp.uid('fan'));

-- J5 de liga, hace 2 días (abierta, cierra antes): 4-2. A 34' con 2 goles (B asiste uno). GK 40'. B 30'. C, 0'.
select pg_temp.keep('m1', pg_temp.create_match(pg_temp.id('season'), pg_temp.id('league'), 5, now() - interval '2 days', 4, 2, true)::text);
select pg_temp.play(pg_temp.id('m1'), pg_temp.id('gk'), 40);
select pg_temp.play(pg_temp.id('m1'), pg_temp.id('a'), 34);
select pg_temp.play(pg_temp.id('m1'), pg_temp.id('b'), 30);
select pg_temp.play(pg_temp.id('m1'), pg_temp.id('c'), 0);
insert into public.goals (match_id, scorer_id, assist_id) values (pg_temp.id('m1'), pg_temp.id('a'), pg_temp.id('b'));
insert into public.goals (match_id, scorer_id) values (pg_temp.id('m1'), pg_temp.id('a'));
-- B ya votó a A con un 8; GK votó a B con un 6 (C no debe ver ninguna de las dos).
select pg_temp.add_vote(pg_temp.id('m1'), pg_temp.user_of(pg_temp.id('b')), pg_temp.id('a'), 8);
select pg_temp.add_vote(pg_temp.id('m1'), pg_temp.user_of(pg_temp.id('gk')), pg_temp.id('b'), 6);

-- J2 de copa, ayer (abierta, cierra después): solo B juega.
select pg_temp.keep('m2', pg_temp.create_match(pg_temp.id('season'), pg_temp.id('cup'), 2, now() - interval '1 day', 1, 1, true)::text);
select pg_temp.play(pg_temp.id('m2'), pg_temp.id('b'), 40);

-- J4 de liga, hace 10 días: votación cerrada, no sale. J6 sin terminar: no sale.
select pg_temp.keep('m3', pg_temp.create_match(pg_temp.id('season'), pg_temp.id('league'), 4, now() - interval '10 days', 1, 0, true)::text);
select pg_temp.play(pg_temp.id('m3'), pg_temp.id('a'), 40);
select pg_temp.keep('m4', pg_temp.create_match(pg_temp.id('season'), pg_temp.id('league'), 6, now() - interval '3 hours')::text);
select pg_temp.play(pg_temp.id('m4'), pg_temp.id('a'), 40);

-- Lo que ve B: GK y A en J5 (no a sí mismo, no a C con 0') y nada en la copa (solo jugó él).
select pg_temp.act_as(pg_temp.user_of(pg_temp.id('b')));
create temp table b_votes as select * from public.get_my_open_votes();
reset role;

select results_eq($$ select label, nickname from b_votes order by voting_closes_at, nickname $$,
                  $$ values ('J5', 'A12'), ('J5', 'GK12') $$,
                  'solo compañeros con minutos de partidos abiertos, sin uno mismo, del que cierra antes al último');
select results_eq($$ select my_score from b_votes order by nickname $$, $$ values (8.0), (null::numeric) $$,
                  'mi nota a quien ya voté; null si está pendiente');
select results_eq($$ select minutes, goals, assists, goals_conceded, shirt_number from b_votes order by nickname $$,
                  $$ values (34, 2::bigint, 0::bigint, null::int, 7), (40, 0::bigint, 0::bigint, 2, 1) $$,
                  'datos de ese partido: minutos, goles, asistencias, encajados (solo porteros) y dorsal');
select results_eq($$ select distinct opponent, goals_for, goals_against, voting_closes_at = match_date + interval '7 days' from b_votes $$,
                  $$ values ('Rival 5', 4, 2, true) $$,
                  'rival, resultado y cierre a 7 días');

-- C (0 minutos, pero de la plantilla) vota a los tres que jugaron en J5 y a B en la copa; no ve las notas de otros.
select pg_temp.act_as(pg_temp.user_of(pg_temp.id('c')));
select results_eq($$ select label, nickname, my_score from public.get_my_open_votes() order by voting_closes_at, nickname $$,
                  $$ values ('J5', 'A12', null::numeric), ('J5', 'B12', null), ('J5', 'GK12', null), ('Copa J2', 'B12', null) $$,
                  'las notas de otros votantes nunca salen');
reset role;

-- El viewer elegido vota como uno más; uno no elegido no ve nada.
select pg_temp.act_as(pg_temp.uid('fan'));
select is((select count(*) from public.get_my_open_votes()), 4::bigint, 'el viewer votante de la temporada ve a todos los que jugaron');
reset role;
select pg_temp.act_as(pg_temp.uid('other'));
select is_empty($$ select * from public.get_my_open_votes() $$, 'un viewer no elegido no tiene nada que votar');
reset role;

-- Sin sesión no se puede llamar.
select pg_temp.act_as_anon();
select throws_ok('select * from public.get_my_open_votes()', '42501', null, 'sin sesión no se puede llamar');
reset role;

select * from finish();
rollback;
