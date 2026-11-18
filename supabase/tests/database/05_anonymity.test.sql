-- Anonimato de los votos: nadie lee votos ajenos y las medias solo se ven con la votación cerrada.
begin;
\ir ../helpers.psql
select no_plan();

select pg_temp.keep('season', pg_temp.create_season('TEST 05')::text);
select pg_temp.keep('comp', pg_temp.create_competition('TEST 05 Liga', 'league')::text);
select pg_temp.keep('a', pg_temp.create_player(pg_temp.id('season'), 'A05', 7)::text);
select pg_temp.keep('b', pg_temp.create_player(pg_temp.id('season'), 'B05', 8)::text);
select pg_temp.keep('c', pg_temp.create_player(pg_temp.id('season'), 'C05', 9)::text);
select pg_temp.keep('admin', pg_temp.create_user('admin05@example.com', 'admin')::text);
select pg_temp.keep('super', pg_temp.create_user('super05@example.com', 'superadmin')::text);
-- Partido de hace 2 días: votación abierta.
select pg_temp.keep('match', pg_temp.create_match(pg_temp.id('season'), pg_temp.id('comp'), 1, now() - interval '2 days', 2, 1, true)::text);
select pg_temp.play(pg_temp.id('match'), pg_temp.id('a'), 40);
select pg_temp.play(pg_temp.id('match'), pg_temp.id('b'), 40);
select pg_temp.play(pg_temp.id('match'), pg_temp.id('c'), 40);
select pg_temp.add_vote(pg_temp.id('match'), pg_temp.user_of(pg_temp.id('a')), pg_temp.id('b'), 8);
select pg_temp.add_vote(pg_temp.id('match'), pg_temp.user_of(pg_temp.id('c')), pg_temp.id('b'), 6);
select pg_temp.keep('a_user', pg_temp.user_of(pg_temp.id('a'))::text);
select pg_temp.keep('b_user', pg_temp.user_of(pg_temp.id('b'))::text);

-- Cada uno solo ve sus propios votos; ni el admin ni el superadmin ven los de nadie.
select pg_temp.act_as(current_setting('t.a_user')::uuid);
select is((select count(*)::int from public.votes), 1, 'un jugador solo ve su propio voto');
reset role;
select pg_temp.act_as(current_setting('t.b_user')::uuid);
select is_empty($$ select 1 from public.votes $$, 'el jugador votado no ve quién le votó ni qué');
reset role;
select pg_temp.act_as(current_setting('t.admin')::uuid);
select is_empty($$ select 1 from public.votes $$, 'el admin no ve votos');
reset role;
select pg_temp.act_as(current_setting('t.super')::uuid);
select is_empty($$ select 1 from public.votes $$, 'el superadmin no ve votos');

-- Las vistas con las medias no son accesibles desde la API.
select throws_ok($$ select * from private.match_ratings $$, '42501', null, 'private.match_ratings no es accesible');
select throws_ok($$ select * from private.match_mvp $$, '42501', null, 'private.match_mvp no es accesible');

-- Con la votación abierta no hay media, ni en la lista ni en la gráfica, ni MVP.
select is((select avg_rating from public.get_squad_stats(current_setting('t.season')::bigint, null)
           where player_id = current_setting('t.b')::bigint), null, 'con la votación abierta la lista no muestra media');
select is((select rated_matches from public.get_squad_stats(current_setting('t.season')::bigint, null)
           where player_id = current_setting('t.b')::bigint), 0::bigint, 'con la votación abierta no cuenta partidos valorados');
select is_empty(format('select 1 from public.get_player_rating_timeline(%s, %s)', current_setting('t.b'), current_setting('t.season')),
                'con la votación abierta la gráfica está vacía');
select is_empty(format('select 1 from public.get_season_mvps(%s)', current_setting('t.season')),
                'con la votación abierta no hay MVP');
reset role;

-- Al cerrarse (7 días desde el partido) aparece la media.
update public.matches set match_date = now() - interval '8 days' where id = pg_temp.id('match');
select pg_temp.act_as(current_setting('t.a_user')::uuid);
select is((select avg_rating from public.get_squad_stats(current_setting('t.season')::bigint, null)
           where player_id = current_setting('t.b')::bigint), 7.00, 'con la votación cerrada la lista muestra la media');
reset role;

select * from finish();
rollback;
