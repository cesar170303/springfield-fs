-- Validaciones de datos: constraints y triggers que protegen la coherencia de las estadísticas.
begin;
\ir ../helpers.psql
select no_plan();

select pg_temp.keep('season', pg_temp.create_season('TEST 03')::text);
select pg_temp.keep('other_season', pg_temp.create_season('TEST 03 B')::text);
select pg_temp.keep('comp', pg_temp.create_competition('TEST 03 Liga', 'league')::text);
select pg_temp.keep('a', pg_temp.create_player(pg_temp.id('season'), 'A03', 7)::text);
select pg_temp.keep('b', pg_temp.create_player(pg_temp.id('season'), 'B03', 8)::text);
select pg_temp.keep('c', pg_temp.create_player(pg_temp.id('season'), 'C03', 9)::text);
select pg_temp.keep('outsider', pg_temp.create_player(pg_temp.id('other_season'), 'OUT03', 9)::text);
select pg_temp.keep('match', pg_temp.create_match(pg_temp.id('season'), pg_temp.id('comp'), 1, now() - interval '1 day', 1, 0, true)::text);
select pg_temp.play(pg_temp.id('match'), pg_temp.id('a'), 40);
select pg_temp.play(pg_temp.id('match'), pg_temp.id('b'), 0);
select pg_temp.play(pg_temp.id('match'), pg_temp.id('c'), 20);

-- Minutos
select throws_ok($$ update public.match_squad set minutes = 41 where player_id = pg_temp.id('a') $$,
                 '23514', null, 'no se pueden poner más de 40 minutos');
select throws_ok($$ update public.match_squad set minutes = -1 where player_id = pg_temp.id('a') $$,
                 '23514', null, 'no se pueden poner minutos negativos');

-- Convocatoria
select throws_ok($$ select pg_temp.play(pg_temp.id('match'), pg_temp.id('outsider'), 10) $$,
                 'P0001', null, 'no se puede convocar a quien no está en la plantilla de esa temporada');

-- Goles
select throws_ok($$ insert into public.goals (match_id, scorer_id) values (pg_temp.id('match'), pg_temp.id('b')) $$,
                 'P0001', null, 'un jugador con 0 minutos no puede marcar');
select throws_ok($$ insert into public.goals (match_id, scorer_id, assist_id)
                    values (pg_temp.id('match'), pg_temp.id('a'), pg_temp.id('b')) $$,
                 'P0001', null, 'un jugador con 0 minutos no puede asistir');
select throws_ok($$ insert into public.goals (match_id, scorer_id, assist_id, type)
                    values (pg_temp.id('match'), pg_temp.id('a'), pg_temp.id('c'), 'penalty') $$,
                 '23514', null, 'un penalti no lleva asistencia');
select throws_ok($$ insert into public.goals (match_id, scorer_id, assist_id)
                    values (pg_temp.id('match'), pg_temp.id('a'), pg_temp.id('a')) $$,
                 '23514', null, 'nadie se asiste a sí mismo');
select lives_ok($$ insert into public.goals (match_id, scorer_id) values (pg_temp.id('match'), pg_temp.id('a')) $$,
                'un gol válido se registra');
select throws_ok($$ insert into public.goals (match_id, scorer_id) values (pg_temp.id('match'), pg_temp.id('c')) $$,
                 'P0001', null, 'no puede haber más goles registrados que goals_for');
select throws_ok($$ update public.matches set goals_for = 0 where id = pg_temp.id('match') $$,
                 'P0001', null, 'no se puede bajar goals_for por debajo de los goles registrados');

-- Partido terminado sin resultado
select throws_ok($$ insert into public.matches (season_id, competition_id, round, match_date, opponent, is_finished)
                    values (pg_temp.id('season'), pg_temp.id('comp'), 2, now(), 'X', true) $$,
                 '23514', null, 'un partido terminado necesita resultado');

-- Notas: de 1 a 10 y solo medios puntos
select throws_ok($$ select pg_temp.add_vote(pg_temp.id('match'), pg_temp.user_of(pg_temp.id('c')), pg_temp.id('a'), 7.3) $$,
                 '23514', null, 'la nota solo admite medios puntos');
select throws_ok($$ select pg_temp.add_vote(pg_temp.id('match'), pg_temp.user_of(pg_temp.id('c')), pg_temp.id('a'), 10.5) $$,
                 '23514', null, 'la nota no pasa de 10');
select lives_ok($$ select pg_temp.add_vote(pg_temp.id('match'), pg_temp.user_of(pg_temp.id('c')), pg_temp.id('a'), 7.5) $$,
                'una nota en medio punto se guarda');

select * from finish();
rollback;
