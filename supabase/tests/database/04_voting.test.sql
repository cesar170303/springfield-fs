-- Reglas de votación: quién vota, a quién, cuándo, y que cada voto es definitivo.
begin;
\ir ../helpers.psql
select no_plan();

select pg_temp.keep('season', pg_temp.create_season('TEST 04')::text);
select pg_temp.keep('other_season', pg_temp.create_season('TEST 04 B')::text);
select pg_temp.keep('comp', pg_temp.create_competition('TEST 04 Liga', 'league')::text);
select pg_temp.keep('a', pg_temp.create_player(pg_temp.id('season'), 'A04', 7)::text);
select pg_temp.keep('b', pg_temp.create_player(pg_temp.id('season'), 'B04', 8)::text);
select pg_temp.keep('c', pg_temp.create_player(pg_temp.id('season'), 'C04', 9)::text);    -- convocado, 0 minutos
select pg_temp.keep('d', pg_temp.create_player(pg_temp.id('season'), 'D04', 10)::text);   -- jugó y luego se archiva
select pg_temp.keep('a_user', pg_temp.user_of(pg_temp.id('a'))::text);
select pg_temp.keep('d_user', pg_temp.user_of(pg_temp.id('d'))::text);
select pg_temp.keep('viewer', pg_temp.create_user('viewer04@example.com')::text);      -- viewer no elegido
select pg_temp.keep('guest', pg_temp.create_user('guest04@example.com')::text);        -- viewer elegido esta temporada
select pg_temp.keep('guest_other', pg_temp.create_user('other04@example.com')::text);  -- elegido en otra temporada
select pg_temp.keep('admin', pg_temp.create_user('admin04@example.com', 'admin')::text);

select pg_temp.keep('open', pg_temp.create_match(pg_temp.id('season'), pg_temp.id('comp'), 1, now() - interval '1 day', 2, 1, true)::text);
select pg_temp.keep('closed', pg_temp.create_match(pg_temp.id('season'), pg_temp.id('comp'), 2, now() - interval '8 days', 1, 1, true)::text);
select pg_temp.keep('unplayed', pg_temp.create_match(pg_temp.id('season'), pg_temp.id('comp'), 3, now() - interval '1 hour')::text);
select pg_temp.play(m, p, 40) from (values (pg_temp.id('open')), (pg_temp.id('closed')), (pg_temp.id('unplayed'))) ms(m),
                                    (values (pg_temp.id('a')), (pg_temp.id('b')), (pg_temp.id('d'))) ps(p);
select pg_temp.play(pg_temp.id('open'), pg_temp.id('c'), 0);
update public.players set archived_at = now() where id = pg_temp.id('d');

-- Viewers votantes: los elige el staff, por temporada.
select pg_temp.act_as(pg_temp.uid('viewer'));
select throws_ok(format($$ insert into public.season_voters (season_id, user_id) values (%s, %L) $$,
                        current_setting('t.season'), current_setting('t.viewer')),
                 '42501', null, 'un viewer no puede elegirse a sí mismo como votante');
reset role;
select pg_temp.act_as(pg_temp.uid('admin'));
select lives_ok(format($$ insert into public.season_voters (season_id, user_id) values (%s, %L), (%s, %L) $$,
                       current_setting('t.season'), current_setting('t.guest'),
                       current_setting('t.other_season'), current_setting('t.guest_other')),
                'el admin elige viewers votantes por temporada');
reset role;
select pg_temp.act_as(pg_temp.uid('guest'));
select is((select count(*)::int from public.season_voters), 1, 'un viewer votante solo ve su propia fila');
reset role;
select pg_temp.act_as(pg_temp.uid('viewer'));
select is_empty($$ select 1 from public.season_voters $$, 'un viewer no elegido no ve la lista de votantes');
reset role;

-- Jugador de la plantilla
select pg_temp.act_as(pg_temp.uid('a_user'));
select lives_ok(format($$ insert into public.votes (match_id, voter_id, rated_id, score) values (%s, %L, %s, 7) $$,
                       current_setting('t.open'), current_setting('t.a_user'), current_setting('t.b')),
                'un jugador vota a un compañero que jugó');
select throws_ok(format($$ insert into public.votes (match_id, voter_id, rated_id, score) values (%s, %L, %s, 7) $$,
                        current_setting('t.open'), current_setting('t.a_user'), current_setting('t.a')),
                 '42501', null, 'nadie se vota a sí mismo');
select throws_ok(format($$ insert into public.votes (match_id, voter_id, rated_id, score) values (%s, %L, %s, 7) $$,
                        current_setting('t.open'), current_setting('t.a_user'), current_setting('t.c')),
                 '42501', null, 'no se vota a quien no jugó ningún minuto');
select throws_ok(format($$ insert into public.votes (match_id, voter_id, rated_id, score) values (%s, %L, %s, 7) $$,
                        current_setting('t.closed'), current_setting('t.a_user'), current_setting('t.b')),
                 '42501', null, 'no se vota con la votación cerrada (7 días)');
select throws_ok(format($$ insert into public.votes (match_id, voter_id, rated_id, score) values (%s, %L, %s, 7) $$,
                        current_setting('t.unplayed'), current_setting('t.a_user'), current_setting('t.b')),
                 '42501', null, 'no se vota un partido que no está terminado');
select throws_ok(format($$ insert into public.votes (match_id, voter_id, rated_id, score) values (%s, %L, %s, 7) $$,
                        current_setting('t.open'), current_setting('t.guest'), current_setting('t.d')),
                 '42501', null, 'nadie vota en nombre de otro');

-- Cada voto es definitivo: ni se cambia ni se borra, tampoco con upsert.
select throws_ok($$ update public.votes set score = 10 where rated_id = pg_temp.id('b') $$,
                 '42501', null, 'un voto no se cambia');
select throws_ok($$ delete from public.votes where rated_id = pg_temp.id('b') $$,
                 '42501', null, 'un voto no se borra');
select throws_ok(format($$ insert into public.votes (match_id, voter_id, rated_id, score) values (%s, %L, %s, 10)
                           on conflict (match_id, voter_id, rated_id) do update set score = excluded.score $$,
                        current_setting('t.open'), current_setting('t.a_user'), current_setting('t.b')),
                 '42501', null, 'un voto no se cambia con upsert');
select throws_ok(format($$ insert into public.votes (match_id, voter_id, rated_id, score) values (%s, %L, %s, 9) $$,
                        current_setting('t.open'), current_setting('t.a_user'), current_setting('t.b')),
                 '23505', null, 'no se puede votar dos veces al mismo compañero');
reset role;
select results_eq(format('select score from public.votes where match_id = %s and rated_id = %s', current_setting('t.open'), current_setting('t.b')),
                  $$ values (7.0::numeric(3,1)) $$, 'el voto emitido sigue intacto (ni cambiado ni borrado)');

-- Quién no vota
select pg_temp.act_as(pg_temp.uid('viewer'));
select throws_ok(format($$ insert into public.votes (match_id, voter_id, rated_id, score) values (%s, %L, %s, 7) $$,
                        current_setting('t.open'), current_setting('t.viewer'), current_setting('t.b')),
                 '42501', null, 'un viewer no elegido no vota');
reset role;
select pg_temp.act_as(pg_temp.uid('guest_other'));
select throws_ok(format($$ insert into public.votes (match_id, voter_id, rated_id, score) values (%s, %L, %s, 7) $$,
                        current_setting('t.open'), current_setting('t.guest_other'), current_setting('t.b')),
                 '42501', null, 'un viewer elegido en otra temporada no vota en esta');
reset role;
select pg_temp.act_as(pg_temp.uid('admin'));
select throws_ok(format($$ insert into public.votes (match_id, voter_id, rated_id, score) values (%s, %L, %s, 7) $$,
                        current_setting('t.open'), current_setting('t.admin'), current_setting('t.b')),
                 '42501', null, 'un admin sin ficha ni permiso de votante no vota');
reset role;
select pg_temp.act_as(pg_temp.uid('d_user'));
select throws_ok(format($$ insert into public.votes (match_id, voter_id, rated_id, score) values (%s, %L, %s, 7) $$,
                        current_setting('t.open'), current_setting('t.d_user'), current_setting('t.b')),
                 '42501', null, 'un jugador archivado no vota');
reset role;

-- Viewer elegido: vota como un jugador más.
select pg_temp.act_as(pg_temp.uid('guest'));
select lives_ok(format($$ insert into public.votes (match_id, voter_id, rated_id, score) values (%s, %L, %s, 9) $$,
                       current_setting('t.open'), current_setting('t.guest'), current_setting('t.b')),
                'un viewer elegido vota');
select lives_ok(format($$ insert into public.votes (match_id, rated_id, score) values (%s, %s, 6) $$,
                       current_setting('t.open'), current_setting('t.a')),
                'el votante se rellena solo con la cuenta de quien vota');
select is((select count(*)::int from public.votes), 2, 'el viewer votante solo ve sus propios votos');
reset role;

-- Su voto pesa igual en la media.
update public.matches set match_date = now() - interval '8 days' where id = pg_temp.id('open');
select pg_temp.act_as(pg_temp.uid('a_user'));
select is((select r.rating from public.get_player_rating_timeline(current_setting('t.b')::bigint, current_setting('t.season')::bigint) r
           where r.match_id = current_setting('t.open')::bigint), 8.00,
          'la media de B junta el voto del jugador (7) y el del viewer (9)');
reset role;

select * from finish();
rollback;
