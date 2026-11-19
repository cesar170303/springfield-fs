-- Avisos push: quién recibe cada uno, cuándo, y que no se repiten (docs/SPEC.md §8).
begin;
\ir ../helpers.psql
select no_plan();

select pg_temp.keep('season', pg_temp.create_season('TEST 09')::text);
select pg_temp.keep('comp', pg_temp.create_competition('TEST 09 Liga', 'league')::text);
select pg_temp.keep('a', pg_temp.create_player(pg_temp.id('season'), 'A09', 7)::text);
select pg_temp.keep('b', pg_temp.create_player(pg_temp.id('season'), 'B09', 8)::text);
select pg_temp.keep('c', pg_temp.create_player(pg_temp.id('season'), 'C09', 9)::text);
select pg_temp.keep('d', pg_temp.create_player(pg_temp.id('season'), 'D09', 10)::text);  -- se archiva
select pg_temp.keep('a_user', pg_temp.user_of(pg_temp.id('a'))::text);
select pg_temp.keep('b_user', pg_temp.user_of(pg_temp.id('b'))::text);
select pg_temp.keep('c_user', pg_temp.user_of(pg_temp.id('c'))::text);
select pg_temp.keep('d_user', pg_temp.user_of(pg_temp.id('d'))::text);
select pg_temp.keep('guest', pg_temp.create_user('guest09@example.com')::text);   -- viewer elegido
select pg_temp.keep('viewer', pg_temp.create_user('viewer09@example.com')::text); -- viewer no elegido
insert into public.season_voters (season_id, user_id) values (pg_temp.id('season'), pg_temp.uid('guest'));
update public.players set archived_at = now() where id = pg_temp.id('d');
select pg_temp.subscribe(u) from (values (pg_temp.uid('a_user')), (pg_temp.uid('b_user')), (pg_temp.uid('c_user')),
                                         (pg_temp.uid('d_user')), (pg_temp.uid('guest')), (pg_temp.uid('viewer'))) v(u);
-- A tiene dos dispositivos: recibe el aviso en los dos.
select pg_temp.subscribe(pg_temp.uid('a_user'));

-- Partido terminado ayer: votación abierta.
select pg_temp.keep('m', pg_temp.create_match(pg_temp.id('season'), pg_temp.id('comp'), 1, now() - interval '1 day', 2, 1, true)::text);
select pg_temp.play(pg_temp.id('m'), p, 40) from (values (pg_temp.id('a')), (pg_temp.id('b')), (pg_temp.id('c'))) v(p);
-- Partido sin terminar y partido cerrado hace un mes (nunca avisado): no generan avisos.
select pg_temp.create_match(pg_temp.id('season'), pg_temp.id('comp'), 2, now() - interval '2 hours');
select pg_temp.create_match(pg_temp.id('season'), pg_temp.id('comp'), 3, now() - interval '30 days', 0, 0, true);

-- Permisos: solo el servidor (service_role) puede pedir los avisos.
select ok(not has_function_privilege('anon', 'public.claim_pending_notifications()', 'execute'), 'un anónimo no puede pedir los avisos');
select ok(not has_function_privilege('authenticated', 'public.claim_pending_notifications()', 'execute'), 'un usuario no puede pedir los avisos');
select ok(has_function_privilege('service_role', 'public.claim_pending_notifications()', 'execute'), 'el servidor sí puede');

-- 1. Votación abierta: a los votantes de la temporada (plantilla no archivada + viewer elegido).
create temp table open_claim as select * from public.claim_pending_notifications();
select results_eq($$ select distinct kind, match_id from open_claim $$,
                  $$ values ('voting_open', pg_temp.id('m')) $$, 'solo hay aviso de votación abierta del partido terminado');
select set_eq($$ select distinct user_id from open_claim $$,
              $$ values (pg_temp.uid('a_user')), (pg_temp.uid('b_user')), (pg_temp.uid('c_user')), (pg_temp.uid('guest')) $$,
              'votación abierta: plantilla activa y viewer elegido, no el archivado ni el viewer no elegido');
select is((select count(*)::int from open_claim where user_id = pg_temp.uid('a_user')), 2, 'llega a cada dispositivo del usuario');
select ok((select bool_and(endpoint is not null and p256dh is not null and auth is not null and title <> '' and body <> '') from open_claim),
          'cada aviso trae suscripción, título y texto');
select is_empty($$ select * from public.claim_pending_notifications() $$, 'el mismo aviso no se envía dos veces');

-- 2. Queda 1 día: solo a quien le falta algún compañero.
update public.matches set match_date = now() - interval '6 days 12 hours' where id = pg_temp.id('m');
select pg_temp.add_vote(pg_temp.id('m'), pg_temp.uid('a_user'), pg_temp.id('b'), 7);   -- A: completo (B y C)
select pg_temp.add_vote(pg_temp.id('m'), pg_temp.uid('a_user'), pg_temp.id('c'), 7);
select pg_temp.add_vote(pg_temp.id('m'), pg_temp.uid('b_user'), pg_temp.id('a'), 8);   -- B: le falta C
select pg_temp.add_vote(pg_temp.id('m'), pg_temp.uid('guest'), pg_temp.id('a'), 9);    -- viewer: completo (A, B y C)
select pg_temp.add_vote(pg_temp.id('m'), pg_temp.uid('guest'), pg_temp.id('b'), 6);
select pg_temp.add_vote(pg_temp.id('m'), pg_temp.uid('guest'), pg_temp.id('c'), 8);
create temp table reminder_claim as select * from public.claim_pending_notifications();
select results_eq($$ select distinct kind from reminder_claim $$, $$ values ('voting_reminder') $$, 'aviso de que queda 1 día');
select set_eq($$ select distinct user_id from reminder_claim $$,
              $$ values (pg_temp.uid('b_user')), (pg_temp.uid('c_user')) $$,
              'queda 1 día: solo B (a medias) y C (sin votar); no A ni el viewer, que votaron a todos');
select is_empty($$ select * from public.claim_pending_notifications() $$, 'el recordatorio no se repite');

-- 3. Votación cerrada: el MVP a todos los registrados con notificaciones activas.
update public.matches set match_date = now() - interval '7 days 2 hours' where id = pg_temp.id('m');
create temp table closed_claim as select * from public.claim_pending_notifications();
select results_eq($$ select distinct kind from closed_claim $$, $$ values ('voting_closed') $$, 'aviso de votación cerrada');
select set_eq($$ select distinct user_id from closed_claim $$,
              $$ values (pg_temp.uid('a_user')), (pg_temp.uid('b_user')), (pg_temp.uid('c_user')),
                        (pg_temp.uid('d_user')), (pg_temp.uid('guest')), (pg_temp.uid('viewer')) $$,
              'el MVP llega a todos los registrados con notificaciones, voten o no');
select ok((select bool_and(body like '%A09%') from closed_claim), 'el aviso dice quién es el MVP (A, media 8,5)');
select is_empty($$ select * from public.claim_pending_notifications() $$, 'el aviso del MVP no se repite');

-- La cola de avisos enviados no es accesible desde la API.
select pg_temp.act_as(pg_temp.uid('a_user'));
select throws_ok($$ select * from private.notifications_sent $$, '42501', null, 'un usuario no ve la cola de avisos');
reset role;

select * from finish();
rollback;
