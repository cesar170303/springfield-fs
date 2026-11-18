-- Fotos de jugadores: bucket público para leer, solo el staff sube, cambia o borra.
begin;
\ir ../helpers.psql
select no_plan();

select results_eq($$ select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'player-photos' $$,
                  $$ values (true, 2097152::bigint, array['image/webp', 'image/jpeg', 'image/png']) $$,
                  'bucket público, máximo 2 MB, solo webp/jpeg/png');

select pg_temp.keep('viewer', pg_temp.create_user('viewer07@example.com')::text);
select pg_temp.keep('player', pg_temp.create_user('player07@example.com', 'player')::text);
select pg_temp.keep('admin', pg_temp.create_user('admin07@example.com', 'admin')::text);

select pg_temp.act_as(current_setting('t.viewer')::uuid);
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('player-photos', 'v.webp') $$,
                 '42501', null, 'un viewer no sube fotos');
reset role;
select pg_temp.act_as(current_setting('t.player')::uuid);
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('player-photos', 'p.webp') $$,
                 '42501', null, 'un jugador no sube fotos (tampoco la suya)');
reset role;
select pg_temp.act_as(current_setting('t.admin')::uuid);
select lives_ok($$ insert into storage.objects (bucket_id, name) values ('player-photos', 'a.webp') $$,
                'el admin sube fotos');
reset role;

-- Cambiar y borrar: el jugador no puede; el admin sí.
-- La API de Storage activa este ajuste antes de borrar; después decide RLS, que es lo que se prueba aquí.
select set_config('storage.allow_delete_query', 'true', true);
select pg_temp.act_as(current_setting('t.player')::uuid);
update storage.objects set name = 'hacked.webp' where bucket_id = 'player-photos' and name = 'a.webp';
delete from storage.objects where bucket_id = 'player-photos' and name = 'a.webp';
reset role;
select isnt_empty($$ select 1 from storage.objects where bucket_id = 'player-photos' and name = 'a.webp' $$,
                  'el jugador no puede cambiar ni borrar fotos');
-- UPDATE y DELETE solo ven las filas que permite la política de SELECT (auditoría, hallazgo 3).
select pg_temp.act_as(current_setting('t.admin')::uuid);
update storage.objects set name = 'a2.webp' where bucket_id = 'player-photos' and name = 'a.webp';
reset role;
select isnt_empty($$ select 1 from storage.objects where bucket_id = 'player-photos' and name = 'a2.webp' $$,
                  'el admin cambia fotos');
select pg_temp.act_as(current_setting('t.admin')::uuid);
delete from storage.objects where bucket_id = 'player-photos';
reset role;
select is_empty($$ select 1 from storage.objects where bucket_id = 'player-photos' $$,
                'el admin borra fotos');

select * from finish();
rollback;
