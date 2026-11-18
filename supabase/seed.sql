-- =====================================================================
-- Datos de prueba para desarrollo (NO ejecutar en producción)
-- Se ejecuta como postgres, así que se salta RLS pero SÍ pasa los triggers.
-- =====================================================================

insert into public.seasons (id, name, start_date, end_date, is_current)
overriding system value values
  (1, '2026/27', '2026-09-01', '2027-06-30', true);

insert into public.competitions (id, name, type)
overriding system value values
  (1, 'Liga', 'league'),
  (2, 'Copa', 'cup');

insert into public.players (id, first_name, last_name, nickname, email, position)
overriding system value values
  (1, 'Álvaro', 'Gómez',    null,     'alvaro@example.com', 'goalkeeper'),
  (2, 'Daniel', 'Ruiz',     'Dani',   'daniel@example.com', 'defender'),
  (3, 'Sergio', 'López',    'Checo',  'sergio@example.com', 'winger'),
  (4, 'Marcos', 'Herrera',  null,     'marcos@example.com', 'winger'),
  (5, 'Iván',   'Navarro',  'Navi',   'ivan@example.com',   'pivot'),
  (6, 'Pablo',  'Moreno',   null,     'pablo@example.com',  'universal'),
  (7, 'Javier', 'Castillo', 'Javi',   'javier@example.com', 'winger'),
  (8, 'Rubén',  'Ortega',   null,     'ruben@example.com',  'pivot');

-- Cuentas de prueba para cada ficha, SIN contraseña (no se puede iniciar sesión con ellas).
-- Hacen falta porque el votante es una cuenta; el trigger on_auth_user_created las vincula a su ficha.
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
select gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', email, '{}'
from public.players;

insert into public.player_seasons (season_id, player_id, shirt_number) values
  (1, 1, 1), (1, 2, 4), (1, 3, 7), (1, 4, 8),
  (1, 5, 9), (1, 6, 5), (1, 7, 10), (1, 8, 11);

-- Partidos: J1–J4 y Copa J1 con votación cerrada, J5 reciente (votación
-- abierta) y J6 sin jugar. Las fechas son relativas a hoy para que la
-- ventana de 7 días funcione siempre que cargues el seed.
insert into public.matches (id, season_id, competition_id, round, match_date, opponent, goals_for, goals_against, is_finished)
overriding system value values
  (1, 1, 1, 1, now() - interval '42 days', 'CD Torrejón',     5, 2, true),
  (2, 1, 1, 2, now() - interval '35 days', 'AD Meco',         3, 3, true),
  (3, 1, 2, 1, now() - interval '28 days', 'FS Coslada',      4, 1, true),
  (4, 1, 1, 3, now() - interval '21 days', 'CF Daganzo',      2, 0, true),
  (5, 1, 1, 4, now() - interval '14 days', 'UD San Fernando', 1, 4, true),
  (6, 1, 1, 5, now() - interval '2 days',  'Inter Arganda',   3, 2, true),
  (7, 1, 1, 6, now() + interval '5 days',  'CD Mejorada',     null, null, false);

-- Convocatorias y minutos (partido de 40'). El 8 no juega en el partido 2.
insert into public.match_squad (match_id, player_id, minutes, yellow_card, red_card) values
  (1,1,40,false,false),(1,2,30,true,false),(1,3,28,false,false),(1,4,25,false,false),(1,5,32,false,false),(1,6,20,false,false),(1,7,15,false,false),(1,8,10,false,false),
  (2,1,40,false,false),(2,2,35,false,false),(2,3,30,true,false),(2,4,28,false,false),(2,5,30,false,false),(2,6,22,false,false),(2,7,15,false,false),(2,8,0,false,false),
  (3,1,40,false,false),(3,2,25,false,false),(3,3,30,false,false),(3,4,30,false,false),(3,5,28,false,true),(3,6,25,false,false),(3,7,12,false,false),(3,8,10,false,false),
  (4,1,40,false,false),(4,2,32,false,false),(4,3,30,false,false),(4,4,26,true,false),(4,6,28,false,false),(4,7,20,false,false),(4,8,24,false,false),
  (5,1,40,true,false),(5,2,30,false,false),(5,3,30,false,false),(5,4,30,false,false),(5,5,30,false,false),(5,6,20,false,false),(5,7,10,false,false),(5,8,10,false,false),
  (6,1,40,false,false),(6,2,30,false,false),(6,3,32,false,false),(6,4,24,false,false),(6,5,30,false,false),(6,6,24,false,false),(6,7,10,false,false),(6,8,10,false,false);

insert into public.goals (match_id, scorer_id, assist_id, type) values
  (1,5,3,'regular'),(1,5,4,'regular'),(1,3,null,'penalty'),(1,7,2,'regular'),(1,8,5,'regular'),
  (2,5,3,'regular'),(2,4,null,'regular'),(2,3,null,'double_penalty'),
  (3,5,4,'regular'),(3,3,6,'regular'),(3,4,3,'regular'),(3,8,7,'regular'),
  (4,3,4,'regular'),(4,8,3,'regular'),
  (5,4,5,'regular'),
  (6,5,3,'regular'),(6,3,4,'regular'),(6,5,null,'penalty');

insert into public.missed_penalties (match_id, player_id, type) values
  (2, 5, 'penalty'),
  (5, 3, 'double_penalty');

-- Votos: cada jugador de la plantilla (su cuenta) puntúa a los que jugaron (sin autovoto).
-- Notas pseudoaleatorias deterministas entre 5 y 9.5.
insert into public.votes (match_id, voter_id, rated_id, score)
select ms.match_id,
       voter.user_id,
       ms.player_id,
       5 + ((ps.player_id * 7 + ms.player_id * 3 + ms.match_id * 5) % 10) * 0.5
from public.match_squad ms
join public.matches m         on m.id = ms.match_id and m.is_finished
join public.player_seasons ps on ps.season_id = m.season_id
join public.players voter     on voter.id = ps.player_id
where ms.minutes > 0
  and ps.player_id <> ms.player_id;

-- Recolocar las secuencias tras insertar ids a mano
select setval(pg_get_serial_sequence('public.seasons', 'id'),      (select max(id) from public.seasons));
select setval(pg_get_serial_sequence('public.competitions', 'id'), (select max(id) from public.competitions));
select setval(pg_get_serial_sequence('public.players', 'id'),      (select max(id) from public.players));
select setval(pg_get_serial_sequence('public.matches', 'id'),      (select max(id) from public.matches));
