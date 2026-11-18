-- Endurecimiento tras la auditoría (docs/security/2026-11-auditoria.md, hallazgos 1, 5, 6 y 7).
begin;
\ir ../helpers.psql
select no_plan();

select pg_temp.keep('season', pg_temp.create_season('TEST 08')::text);
select pg_temp.keep('comp', pg_temp.create_competition('TEST 08 Liga', 'league')::text);
select pg_temp.keep('a', pg_temp.create_player(pg_temp.id('season'), 'A08', 7)::text);
select pg_temp.keep('b', pg_temp.create_player(pg_temp.id('season'), 'B08', 8)::text);
select pg_temp.keep('a_user', pg_temp.user_of(pg_temp.id('a'))::text);
select pg_temp.keep('viewer', pg_temp.create_user('viewer08@example.com')::text);
select pg_temp.keep('admin', pg_temp.create_user('admin08@example.com', 'admin')::text);

-- Hallazgo 1: el correo de los jugadores solo lo ve el staff.
select pg_temp.act_as(pg_temp.uid('viewer'));
select throws_ok($$ select email from public.players $$, '42501', null, 'un registrado no lee el correo de los jugadores');
select lives_ok($$ select id, first_name, last_name, nickname, position, status, photo_path, archived_at from public.players $$,
                'un registrado sigue leyendo el resto de la ficha');
select throws_ok($$ select * from public.get_player_emails() $$, '42501', null, 'un registrado no puede pedir los correos');
reset role;
select pg_temp.act_as(pg_temp.uid('admin'));
select is((select email from public.get_player_emails() where player_id = pg_temp.id('a')), 'a08@example.com',
          'el staff lee los correos con get_player_emails()');
reset role;
select pg_temp.act_as_anon();
select throws_ok($$ select * from public.get_player_emails() $$, '42501', null, 'un anónimo no puede pedir los correos');
reset role;

-- Hallazgo 5: una cuenta con votos no se puede borrar (las medias cerradas no cambian).
select pg_temp.keep('match', pg_temp.create_match(pg_temp.id('season'), pg_temp.id('comp'), 1, now() - interval '10 days', 1, 0, true)::text);
select pg_temp.play(pg_temp.id('match'), pg_temp.id('a'), 40);
select pg_temp.play(pg_temp.id('match'), pg_temp.id('b'), 40);
select pg_temp.add_vote(pg_temp.id('match'), pg_temp.uid('a_user'), pg_temp.id('b'), 8);
select throws_ok($$ delete from auth.users where id = pg_temp.uid('a_user') $$, '23503', null,
                 'no se puede borrar la cuenta de alguien que ha votado');
select lives_ok($$ delete from auth.users where id = pg_temp.uid('viewer') $$, 'una cuenta sin votos sí se puede borrar');

-- Hallazgo 6: la API no tiene permisos que se salten RLS (TRUNCATE) ni otros que no necesita.
select is_empty($$ select table_name || ' ' || privilege_type || ' ' || grantee
                   from information_schema.table_privileges
                   where table_schema = 'public' and grantee in ('anon', 'authenticated')
                     and privilege_type in ('TRUNCATE', 'TRIGGER', 'REFERENCES') $$,
                'anon y authenticated no tienen TRUNCATE, TRIGGER ni REFERENCES en ninguna tabla');

-- Hallazgo 7: un anónimo no ejecuta funciones security definer, y current_player_id ya no existe.
select is_empty($$ select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                   where n.nspname = 'public' and p.prosecdef and has_function_privilege('anon', p.oid, 'execute') $$,
                'un anónimo no puede ejecutar ninguna función security definer');
select hasnt_function('public', 'current_player_id', 'current_player_id (sin uso) se ha eliminado');

select * from finish();
rollback;
