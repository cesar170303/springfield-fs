-- Vínculo entre ficha de jugador y cuenta: funciona en los dos órdenes y da el rol player.
begin;
\ir ../helpers.psql
select no_plan();

-- 1. Ficha primero, cuenta después.
insert into public.players (first_name, last_name, nickname, email, position)
values ('Ana', 'Test', 'ANA', 'ana02@example.com', 'winger');
select pg_temp.keep('ana', pg_temp.create_user('ana02@example.com')::text);
select is((select user_id from public.players where email = 'ana02@example.com'), pg_temp.uid('ana'),
          'ficha primero: al registrarse se vincula');
select is((select role::text from public.profiles where id = pg_temp.uid('ana')), 'player',
          'ficha primero: la cuenta pasa a player');

-- 2. Cuenta primero, ficha después (y con el correo en mayúsculas).
select pg_temp.keep('bea', pg_temp.create_user('bea02@example.com')::text);
select is((select role::text from public.profiles where id = pg_temp.uid('bea')), 'viewer',
          'sin ficha, la cuenta es viewer');
insert into public.players (first_name, last_name, nickname, email, position)
values ('Bea', 'Test', 'BEA', 'BEA02@Example.com', 'pivot');
select is((select user_id from public.players where email = 'bea02@example.com'), pg_temp.uid('bea'),
          'cuenta primero: al crear la ficha se vincula (sin distinguir mayúsculas)');
select is((select role::text from public.profiles where id = pg_temp.uid('bea')), 'player',
          'cuenta primero: la cuenta pasa a player');

-- 3. Un admin con ficha sigue siendo admin.
select pg_temp.keep('cris', pg_temp.create_user('cris02@example.com', 'admin')::text);
insert into public.players (first_name, last_name, nickname, email, position)
values ('Cris', 'Test', 'CRIS', 'cris02@example.com', 'defender');
select is((select role::text from public.profiles where id = pg_temp.uid('cris')), 'admin',
          'crear la ficha de un admin no le baja a player');

-- 4. Sin ficha con ese correo no se vincula nada.
select pg_temp.keep('dani', pg_temp.create_user('dani02@example.com')::text);
select is_empty($$ select 1 from public.players where user_id = pg_temp.uid('dani') $$,
                'sin ficha con su correo, la cuenta no se vincula a ninguna');

select * from finish();
rollback;
