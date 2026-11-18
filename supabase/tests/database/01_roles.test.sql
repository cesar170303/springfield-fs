-- Permisos por rol: quién puede leer y escribir.
begin;
\ir ../helpers.psql
select no_plan();

-- Datos: una temporada de prueba y un usuario de cada rol.
insert into public.seasons (name, start_date, end_date) values ('TEST 01', '2030-09-01', '2031-06-30');
select set_config('t.viewer', pg_temp.create_user('viewer01@example.com')::text, true);
select set_config('t.admin', pg_temp.create_user('admin01@example.com', 'admin')::text, true);
select set_config('t.super', pg_temp.create_user('super01@example.com', 'superadmin')::text, true);

-- Visitante sin sesión: no ve nada ni puede llamar a las RPC.
select pg_temp.act_as_anon();
select is_empty($$ select 1 from public.seasons $$, 'anónimo no ve temporadas');
select is_empty($$ select 1 from public.profiles $$, 'anónimo no ve perfiles');
select throws_ok($$ select * from public.get_squad_stats(1, null) $$, '42501', null, 'anónimo no puede llamar a get_squad_stats');
reset role;

-- Viewer: lee datos deportivos, no escribe, solo ve su perfil y no puede subirse el rol.
select pg_temp.act_as(current_setting('t.viewer')::uuid);
select isnt_empty($$ select 1 from public.seasons where name = 'TEST 01' $$, 'viewer lee temporadas');
select throws_ok($$ insert into public.seasons (name, start_date, end_date) values ('X', '2032-01-01', '2032-06-01') $$,
                 '42501', null, 'viewer no crea temporadas');
update public.seasons set name = 'HACKED' where name = 'TEST 01';
select is((select count(*)::int from public.profiles), 1, 'viewer solo ve su propio perfil');
update public.profiles set role = 'superadmin' where id = current_setting('t.viewer')::uuid;
reset role;
select isnt_empty($$ select 1 from public.seasons where name = 'TEST 01' $$, 'el update del viewer no cambió nada');
select is((select role::text from public.profiles where id = current_setting('t.viewer')::uuid), 'viewer',
          'viewer no puede subirse el rol');

-- Admin: escribe datos deportivos y ve todos los perfiles, pero no cambia roles.
select pg_temp.act_as(current_setting('t.admin')::uuid);
select lives_ok($$ insert into public.seasons (name, start_date, end_date) values ('TEST 01 B', '2032-09-01', '2033-06-30') $$,
                'admin crea temporadas');
select ok((select count(*) from public.profiles) >= 3, 'admin ve todos los perfiles');
update public.profiles set role = 'admin' where id = current_setting('t.viewer')::uuid;
reset role;
select is((select role::text from public.profiles where id = current_setting('t.viewer')::uuid), 'viewer',
          'admin no puede cambiar roles');

-- Superadmin: puede cambiar roles.
select pg_temp.act_as(current_setting('t.super')::uuid);
update public.profiles set role = 'admin' where id = current_setting('t.viewer')::uuid;
reset role;
select is((select role::text from public.profiles where id = current_setting('t.viewer')::uuid), 'admin',
          'superadmin cambia roles');

select * from finish();
rollback;
