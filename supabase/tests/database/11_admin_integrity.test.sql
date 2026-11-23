-- Integridad para el panel de admin (docs/SPEC.md §9 y §12): lo que el staff no puede hacer sin dañar votos o cifras,
-- y los empates de MVP. Todo se prueba actuando como un admin, igual que una petición de la app.
begin;
\ir ../helpers.psql
select no_plan();

select pg_temp.keep('season', pg_temp.create_season('TEST 11')::text);
select pg_temp.keep('comp', pg_temp.create_competition('TEST 11 Liga', 'league')::text);
select pg_temp.keep('a', pg_temp.create_player(pg_temp.id('season'), 'A11', 7)::text);
select pg_temp.keep('b', pg_temp.create_player(pg_temp.id('season'), 'B11', 8)::text);
select pg_temp.keep('c', pg_temp.create_player(pg_temp.id('season'), 'C11', 9)::text);    -- juega, nadie le vota en «open»
select pg_temp.keep('d', pg_temp.create_player(pg_temp.id('season'), 'D11', 10)::text);   -- nunca convocado
select pg_temp.keep('a_user', pg_temp.user_of(pg_temp.id('a'))::text);
select pg_temp.keep('b_user', pg_temp.user_of(pg_temp.id('b'))::text);
select pg_temp.keep('viewer', pg_temp.create_user('viewer11@example.com')::text);
select pg_temp.keep('admin', pg_temp.create_user('admin11@example.com', 'admin')::text);

-- open: votación abierta, A votado. closed: votación cerrada, A y B empatan a 8 y C tiene un 5.
-- quiet: terminado y sin votos. draft: sin terminar, con convocatoria y goles. future: aún no se ha jugado.
select pg_temp.keep('open',   pg_temp.create_match(pg_temp.id('season'), pg_temp.id('comp'), 1, now() - interval '1 day', 2, 1, true)::text);
select pg_temp.keep('closed', pg_temp.create_match(pg_temp.id('season'), pg_temp.id('comp'), 2, now() - interval '10 days', 2, 0, true)::text);
select pg_temp.keep('quiet',  pg_temp.create_match(pg_temp.id('season'), pg_temp.id('comp'), 3, now() - interval '2 days', 1, 0, true)::text);
select pg_temp.keep('draft',  pg_temp.create_match(pg_temp.id('season'), pg_temp.id('comp'), 4, now() - interval '3 hours', 2, 0)::text);
select pg_temp.keep('future', pg_temp.create_match(pg_temp.id('season'), pg_temp.id('comp'), 5, now() + interval '3 days', 0, 0)::text);
select pg_temp.play(m, p, 30)
from (values (pg_temp.id('open')), (pg_temp.id('closed')), (pg_temp.id('quiet')), (pg_temp.id('draft'))) ms(m),
     (values (pg_temp.id('a')), (pg_temp.id('b')), (pg_temp.id('c'))) ps(p);
insert into public.goals (match_id, scorer_id, assist_id) values
  (pg_temp.id('draft'), pg_temp.id('a'), pg_temp.id('b')),
  (pg_temp.id('quiet'), pg_temp.id('a'), pg_temp.id('b'));
select pg_temp.add_vote(pg_temp.id('open'), pg_temp.uid('b_user'), pg_temp.id('a'), 8);
select pg_temp.add_vote(pg_temp.id('closed'), pg_temp.uid('b_user'), pg_temp.id('a'), 8);
select pg_temp.add_vote(pg_temp.id('closed'), pg_temp.uid('a_user'), pg_temp.id('b'), 8);
select pg_temp.add_vote(pg_temp.id('closed'), pg_temp.uid('a_user'), pg_temp.id('c'), 5);

select pg_temp.act_as(pg_temp.uid('admin'));

-- ---------------------------------------------------------------------
-- Partidos con votos
-- ---------------------------------------------------------------------
select throws_ok($$ delete from public.matches where id = pg_temp.id('open') $$,
                 'P0001', 'No se puede borrar un partido que ya tiene votos', 'un partido con votos no se borra');
select throws_ok($$ update public.matches set is_finished = false where id = pg_temp.id('open') $$,
                 'P0001', 'No se puede reabrir un partido que ya tiene votos', 'un partido con votos no se reabre');
select throws_ok($$ update public.matches set match_date = now() - interval '1 day' where id = pg_temp.id('closed') $$,
                 'P0001', 'La votación de este partido ya se cerró: esa fecha la volvería a abrir',
                 'cambiar la fecha no puede reabrir una votación cerrada');
select lives_ok($$ update public.matches set match_date = now() - interval '9 days' where id = pg_temp.id('closed') $$,
                'con la votación cerrada, la fecha se corrige si sigue cerrada');
select lives_ok($$ update public.matches set match_date = now() - interval '2 days' where id = pg_temp.id('open') $$,
                'con la votación abierta, la fecha se puede corregir');
select lives_ok($$ update public.matches set goals_for = 3, goals_against = 2, opponent = 'Corregido', round = 11 where id = pg_temp.id('open') $$,
                'con votos se corrigen resultado, rival y jornada');

-- ---------------------------------------------------------------------
-- Convocatoria
-- ---------------------------------------------------------------------
select throws_ok($$ delete from public.match_squad where match_id = pg_temp.id('open') and player_id = pg_temp.id('a') $$,
                 'P0001', 'A11 ya tiene votos en este partido: no se puede quitar de la convocatoria',
                 'a un jugador con votos no se le quita de la convocatoria');
select throws_ok($$ update public.match_squad set minutes = 0 where match_id = pg_temp.id('open') and player_id = pg_temp.id('a') $$,
                 'P0001', 'A11 ya tiene votos en este partido: no se le puede dejar a 0 minutos',
                 'a un jugador con votos no se le deja a 0 minutos');
select lives_ok($$ update public.match_squad set minutes = 12, yellow_card = true where match_id = pg_temp.id('open') and player_id = pg_temp.id('a') $$,
                'con votos se corrigen minutos y tarjetas');
select lives_ok($$ insert into public.goals (match_id, scorer_id) values (pg_temp.id('open'), pg_temp.id('a')) $$,
                'con votos se apunta un gol que faltaba');
select lives_ok($$ delete from public.goals where match_id = pg_temp.id('open') $$, 'con votos se borra un gol mal apuntado');
select lives_ok($$ delete from public.match_squad where match_id = pg_temp.id('open') and player_id = pg_temp.id('c') $$,
                'a quien no tiene votos sí se le quita de la convocatoria');
select throws_ok($$ update public.match_squad set minutes = 0 where match_id = pg_temp.id('draft') and player_id = pg_temp.id('a') $$,
                 'P0001', 'A11 tiene goles o asistencias en este partido: bórralos antes de dejarle a 0 minutos',
                 'a un goleador no se le deja a 0 minutos');
select throws_ok($$ update public.match_squad set minutes = 0 where match_id = pg_temp.id('draft') and player_id = pg_temp.id('b') $$,
                 'P0001', 'B11 tiene goles o asistencias en este partido: bórralos antes de dejarle a 0 minutos',
                 'a un asistente no se le deja a 0 minutos');
select lives_ok($$ update public.match_squad set minutes = 0 where match_id = pg_temp.id('draft') and player_id = pg_temp.id('c') $$,
                'sin votos, goles ni asistencias, se puede dejar a 0 minutos');

-- ---------------------------------------------------------------------
-- Partidos sin votos: reabrir, terminar y borrar
-- ---------------------------------------------------------------------
select lives_ok($$ update public.matches set is_finished = false where id = pg_temp.id('quiet') $$, 'sin votos, el partido se reabre');
select lives_ok($$ update public.matches set is_finished = true where id = pg_temp.id('quiet') $$, 'y se vuelve a terminar');
select throws_ok($$ update public.matches set is_finished = true where id = pg_temp.id('future') $$,
                 'P0001', 'Un partido terminado no puede tener una fecha futura', 'no se termina un partido que aún no se ha jugado');
select throws_ok($$ update public.matches set match_date = now() + interval '1 day' where id = pg_temp.id('quiet') $$,
                 'P0001', 'Un partido terminado no puede tener una fecha futura', 'ni se pasa al futuro uno ya terminado');
select throws_ok($$ insert into public.matches (season_id, competition_id, round, match_date, opponent, goals_for, goals_against, is_finished)
                    values (pg_temp.id('season'), pg_temp.id('comp'), 6, now() + interval '1 day', 'X', 1, 0, true) $$,
                 'P0001', 'Un partido terminado no puede tener una fecha futura', 'ni se crea ya terminado en el futuro');
select lives_ok($$ delete from public.matches where id = pg_temp.id('draft') $$, 'un partido sin votos se borra');
select is_empty($$ select 1 from public.goals where match_id = pg_temp.id('draft')
                   union all select 1 from public.match_squad where match_id = pg_temp.id('draft') $$,
                'y arrastra su convocatoria y sus goles');

-- ---------------------------------------------------------------------
-- Plantilla de la temporada
-- ---------------------------------------------------------------------
select throws_ok($$ delete from public.player_seasons where season_id = pg_temp.id('season') and player_id = pg_temp.id('b') $$,
                 'P0001', 'B11 ya fue convocado esta temporada: no se puede quitar de la plantilla',
                 'no se quita de la plantilla a quien ya fue convocado');
select throws_ok($$ update public.player_seasons set player_id = pg_temp.id('d')
                    where season_id = pg_temp.id('season') and player_id = pg_temp.id('b') $$,
                 'P0001', 'B11 ya fue convocado esta temporada: no se puede quitar de la plantilla',
                 'ni se le quita poniendo a otro en su fila');
select lives_ok($$ update public.player_seasons set shirt_number = 88 where season_id = pg_temp.id('season') and player_id = pg_temp.id('b') $$,
                'el dorsal se puede cambiar');
select lives_ok($$ delete from public.player_seasons where season_id = pg_temp.id('season') and player_id = pg_temp.id('d') $$,
                'a quien no fue convocado sí se le quita');
select throws_ok($$ delete from public.players where id = pg_temp.id('b') $$,
                 'P0001', 'Este jugador ya fue convocado esta temporada: no se puede quitar de la plantilla',
                 'borrar una ficha con historial tampoco se puede, y la frase se entiende');

-- ---------------------------------------------------------------------
-- Empates de MVP
-- ---------------------------------------------------------------------
select results_eq($$ select match_id, player_id, rating from public.get_mvp_ties(pg_temp.id('season')) $$,
                  $$ values (pg_temp.id('closed'), pg_temp.id('a'), 8.00), (pg_temp.id('closed'), pg_temp.id('b'), 8.00) $$,
                  'el staff ve solo a los empatados en cabeza, y solo con la votación cerrada');
select throws_ok($$ update public.matches set mvp_override_player_id = pg_temp.id('c') where id = pg_temp.id('closed') $$,
                 'P0001', 'El MVP tiene que ser uno de los jugadores con la mejor media, con la votación cerrada',
                 'no se elige MVP a quien no empata en cabeza');
select throws_ok($$ update public.matches set mvp_override_player_id = pg_temp.id('a') where id = pg_temp.id('open') $$,
                 'P0001', 'El MVP tiene que ser uno de los jugadores con la mejor media, con la votación cerrada',
                 'no se elige MVP con la votación abierta, aunque ya tenga votos');
select lives_ok($$ update public.matches set mvp_override_player_id = pg_temp.id('a') where id = pg_temp.id('closed') $$,
                'se elige a uno de los empatados');
select lives_ok($$ update public.matches set mvp_override_player_id = pg_temp.id('b') where id = pg_temp.id('closed') $$,
                'la elección se puede cambiar');
select is((select count(*)::int from public.get_mvp_ties(pg_temp.id('season'))), 2, 'tras elegir, el empate se sigue viendo');
select lives_ok($$ update public.matches set mvp_override_player_id = null where id = pg_temp.id('closed') $$, 'y se puede quitar');
reset role;

select is((select count(*)::int from public.votes where match_id in (pg_temp.id('open'), pg_temp.id('closed'))), 4,
          'después de todo, los votos siguen intactos');

-- La garantía de fondo: ninguna clave foránea borra votos en cascada, ni siquiera si un voto y un borrado coinciden.
select is_empty($$ select conname::text from pg_constraint
                   where conrelid = 'public.votes'::regclass and contype = 'f' and confdeltype = 'c' $$,
                'ninguna clave foránea de votes borra en cascada');

-- Permisos de la RPC y de las funciones de los triggers
select pg_temp.act_as(pg_temp.uid('a_user'));
select throws_ok($$ select * from public.get_mvp_ties(1) $$, '42501', null, 'un jugador no pide los empates');
reset role;
select pg_temp.act_as(pg_temp.uid('viewer'));
select throws_ok($$ select * from public.get_mvp_ties(1) $$, '42501', null, 'un viewer no pide los empates');
reset role;
select pg_temp.act_as_anon();
select throws_ok($$ select * from public.get_mvp_ties(1) $$, '42501', null, 'un anónimo no pide los empates');
reset role;
select is_empty($$ select p.proname::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                   where n.nspname = 'private' and p.prorettype = 'trigger'::regtype
                     and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')) $$,
                'nadie puede ejecutar las funciones de los triggers');

select * from finish();
rollback;
