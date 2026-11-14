-- =====================================================================
-- Futsal Stats PWA — esquema inicial de Supabase
-- =====================================================================
-- Resumen de reglas de negocio que implementa este archivo:
--   * Un solo equipo de fútbol sala, varias temporadas y competiciones.
--   * Roles: superadmin, admin (editan todo), player (consulta y vota),
--     viewer (registrado sin ficha de jugador: solo consulta).
--   * El admin crea la ficha del jugador con su email; cuando ese email
--     se registra (email o Google) se vincula solo y pasa a rol player.
--   * Estadísticas guardadas POR PARTIDO; los totales se calculan.
--   * Goles como eventos (goleador + asistente opcional).
--   * Valoración = votación anónima de compañeros, 1–10 en medios
--     puntos, sin autovoto, abierta 7 días desde la fecha del partido.
--     Las medias solo se muestran cuando la votación ya está cerrada.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. ENUMS
-- ---------------------------------------------------------------------
create type public.user_role        as enum ('superadmin', 'admin', 'player', 'viewer');
create type public.competition_type as enum ('league', 'cup', 'friendly');
create type public.player_position  as enum ('goalkeeper', 'defender', 'winger', 'pivot', 'universal'); -- portero, cierre, ala, pívot, universal
create type public.player_status    as enum ('available', 'injured', 'suspended');
create type public.goal_type        as enum ('regular', 'penalty', 'double_penalty');
create type public.penalty_type     as enum ('penalty', 'double_penalty');


-- ---------------------------------------------------------------------
-- 2. TABLAS
-- ---------------------------------------------------------------------

-- Un perfil por cada usuario de Supabase Auth (se crea solo, ver trigger)
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text,
  role       public.user_role not null default 'viewer',
  created_at timestamptz not null default now()
);

create table public.seasons (
  id         bigint generated always as identity primary key,
  name       text not null unique,                 -- '2026/27'
  start_date date not null,
  end_date   date not null,
  is_current boolean not null default false,
  check (end_date > start_date)
);
-- Solo puede haber una temporada marcada como actual
create unique index seasons_only_one_current on public.seasons (is_current) where is_current;

create table public.competitions (
  id   bigint generated always as identity primary key,
  name text not null unique,                       -- 'Liga', 'Copa'
  type public.competition_type not null
);

-- Ficha del jugador (existe aunque el jugador nunca se registre)
create table public.players (
  id          bigint generated always as identity primary key,
  first_name  text not null,
  last_name   text not null,
  nickname    text,                                -- apodo (opcional)
  email      text unique check (email = lower(email)), -- para vincular con su cuenta
  user_id     uuid unique references public.profiles (id) on delete set null,
  position    public.player_position not null,
  status      public.player_status not null default 'available',
  photo_path  text,                                -- ruta dentro del bucket 'player-photos'
  archived_at timestamptz,                         -- null = sigue en el equipo
  created_at  timestamptz not null default now()
);

-- Plantilla de cada temporada (el dorsal va aquí porque puede cambiar)
create table public.player_seasons (
  season_id    bigint not null references public.seasons (id) on delete cascade,
  player_id    bigint not null references public.players (id) on delete cascade,
  shirt_number smallint not null check (shirt_number between 1 and 99),
  primary key (season_id, player_id),
  unique (season_id, shirt_number)
);
create index player_seasons_player_idx on public.player_seasons (player_id);

create table public.matches (
  id                     bigint generated always as identity primary key,
  season_id              bigint not null references public.seasons (id),
  competition_id         bigint not null references public.competitions (id),
  round                  smallint not null check (round > 0),   -- jornada (también en copa)
  match_date             timestamptz not null,
  opponent               text not null,
  goals_for              smallint check (goals_for >= 0),
  goals_against          smallint check (goals_against >= 0),
  is_finished            boolean not null default false,        -- al marcarlo se abre la votación
  mvp_override_player_id bigint references public.players (id), -- solo para desempatar el MVP
  created_at             timestamptz not null default now(),
  unique (season_id, competition_id, round),
  check (not is_finished or (goals_for is not null and goals_against is not null))
);
create index matches_season_idx on public.matches (season_id, match_date);

-- Convocatoria + estadísticas individuales del partido.
-- Fila existente = convocado. minutes > 0 = jugó.
create table public.match_squad (
  match_id    bigint not null references public.matches (id) on delete cascade,
  player_id   bigint not null references public.players (id),
  minutes     smallint not null default 0 check (minutes between 0 and 40), -- 2 partes de 20', sin prórroga
  yellow_card boolean not null default false,  -- doble amarilla = solo red_card
  red_card    boolean not null default false,
  primary key (match_id, player_id)
);
create index match_squad_player_idx on public.match_squad (player_id);

-- Cada gol es un evento. Las FK compuestas obligan a que goleador y
-- asistente estén convocados en ESE partido.
create table public.goals (
  id        bigint generated always as identity primary key,
  match_id  bigint not null references public.matches (id) on delete cascade,
  scorer_id bigint not null,
  assist_id bigint,
  type      public.goal_type not null default 'regular',
  foreign key (match_id, scorer_id) references public.match_squad (match_id, player_id) on delete cascade,
  foreign key (match_id, assist_id) references public.match_squad (match_id, player_id) on delete cascade,
  check (assist_id is null or assist_id <> scorer_id),
  check (type = 'regular' or assist_id is null)    -- un penalti no lleva asistencia
);
create index goals_match_idx  on public.goals (match_id);
create index goals_scorer_idx on public.goals (scorer_id);
create index goals_assist_idx on public.goals (assist_id);

-- Penaltis y dobles penaltis fallados (los marcados son goals.type)
create table public.missed_penalties (
  id        bigint generated always as identity primary key,
  match_id  bigint not null,
  player_id bigint not null,
  type      public.penalty_type not null,
  foreign key (match_id, player_id) references public.match_squad (match_id, player_id) on delete cascade
);
create index missed_penalties_match_player_idx on public.missed_penalties (match_id, player_id);

-- Votos anónimos. Se guarda voter_id solo para impedir votos dobles;
-- las políticas RLS impiden que nadie lea los votos de otro.
create table public.votes (
  match_id   bigint not null references public.matches (id) on delete cascade,
  voter_id   bigint not null references public.players (id) on delete cascade,
  rated_id   bigint not null,
  score      numeric(3,1) not null
             check (score between 1 and 10 and score * 2 = trunc(score * 2)), -- 1, 1.5, 2 … 10
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (match_id, voter_id, rated_id),
  foreign key (match_id, rated_id) references public.match_squad (match_id, player_id) on delete cascade,
  check (voter_id <> rated_id)                     -- sin autovoto
);
create index votes_match_rated_idx on public.votes (match_id, rated_id);

-- Suscripciones Web Push de cada dispositivo (para las notificaciones)
create table public.push_subscriptions (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);


-- ---------------------------------------------------------------------
-- 3. FUNCIONES AUXILIARES (se usan en las políticas RLS)
-- ---------------------------------------------------------------------

-- Rol del usuario que hace la petición
create or replace function public.app_role()
returns public.user_role
language sql stable security definer set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(public.app_role() in ('superadmin', 'admin'), false);
$$;

create or replace function public.is_superadmin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(public.app_role() = 'superadmin', false);
$$;

-- Id de la ficha del jugador vinculada al usuario (null si no tiene o está archivado)
create or replace function public.current_player_id()
returns bigint
language sql stable security definer set search_path = ''
as $$
  select id from public.players where user_id = auth.uid() and archived_at is null;
$$;

-- ¿Puede este votante puntuar a este jugador en este partido?
create or replace function public.can_vote(p_match_id bigint, p_voter_id bigint, p_rated_id bigint)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
        p_voter_id = public.current_player_id()
    and p_voter_id <> p_rated_id
    -- el votante está en la plantilla de la temporada y la votación está abierta
    and exists (
          select 1
          from public.matches m
          join public.player_seasons ps
            on ps.season_id = m.season_id and ps.player_id = p_voter_id
          where m.id = p_match_id
            and m.is_finished
            and now() < m.match_date + interval '7 days')
    -- el votado jugó al menos un minuto
    and exists (
          select 1 from public.match_squad ms
          where ms.match_id = p_match_id and ms.player_id = p_rated_id and ms.minutes > 0),
    false);
$$;


-- ---------------------------------------------------------------------
-- 4. TRIGGERS
-- ---------------------------------------------------------------------

-- 4.1 Al registrarse un usuario: crear su perfil y vincularlo a su ficha
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_linked int;
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  );

  update public.players
     set user_id = new.id
   where email = lower(new.email) and user_id is null;
  get diagnostics v_linked = row_count;

  if v_linked > 0 then
    update public.profiles set role = 'player' where id = new.id;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4.2 Si el admin crea la ficha DESPUÉS de que el jugador se haya registrado
create or replace function public.link_player_to_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.email := lower(new.email);
  if new.email is not null and new.user_id is null then
    select id into new.user_id from public.profiles where email = new.email;
    if new.user_id is not null then
      update public.profiles set role = 'player' where id = new.user_id and role = 'viewer';
    end if;
  end if;
  return new;
end;
$$;

create trigger players_link_user
  before insert or update of email on public.players
  for each row execute function public.link_player_to_user();

-- 4.3 Solo se puede convocar a jugadores de la plantilla de esa temporada
create or replace function public.validate_squad_player()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.matches m
    join public.player_seasons ps on ps.season_id = m.season_id
    where m.id = new.match_id and ps.player_id = new.player_id
  ) then
    raise exception 'El jugador % no está en la plantilla de la temporada de este partido', new.player_id;
  end if;
  return new;
end;
$$;

create trigger match_squad_validate_player
  before insert or update on public.match_squad
  for each row execute function public.validate_squad_player();

-- 4.4 Coherencia de goles: goleador/asistente con minutos y no más goles que goals_for
create or replace function public.validate_goal()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  v_goals_for smallint;
  v_count     int;
begin
  if not exists (select 1 from public.match_squad
                 where match_id = new.match_id and player_id = new.scorer_id and minutes > 0) then
    raise exception 'El goleador no tiene minutos en este partido';
  end if;

  if new.assist_id is not null and not exists (
       select 1 from public.match_squad
       where match_id = new.match_id and player_id = new.assist_id and minutes > 0) then
    raise exception 'El asistente no tiene minutos en este partido';
  end if;

  select goals_for into v_goals_for from public.matches where id = new.match_id;
  select count(*)  into v_count
    from public.goals where match_id = new.match_id and id <> new.id;

  if v_goals_for is not null and v_count + 1 > v_goals_for then
    raise exception 'Habría % goles registrados y el partido tiene % a favor', v_count + 1, v_goals_for;
  end if;

  return new;
end;
$$;

create trigger goals_validate
  before insert or update on public.goals
  for each row execute function public.validate_goal();

-- 4.5 No permitir un resultado con menos goles que los ya registrados
create or replace function public.validate_match_score()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  v_count int;
begin
  if new.goals_for is not null then
    select count(*) into v_count from public.goals where match_id = new.id;
    if v_count > new.goals_for then
      raise exception 'Hay % goles registrados y el resultado dice % a favor', v_count, new.goals_for;
    end if;
  end if;
  return new;
end;
$$;

create trigger matches_validate_score
  before update of goals_for on public.matches
  for each row execute function public.validate_match_score();

-- 4.6 updated_at automático en votos
create or replace function public.set_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger votes_set_updated_at
  before update on public.votes
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------

-- 5.1 Tablas de datos deportivos: cualquier usuario registrado lee,
--     solo superadmin/admin escriben.
do $$
declare
  t text;
begin
  foreach t in array array[
    'seasons', 'competitions', 'players', 'player_seasons',
    'matches', 'match_squad', 'goals', 'missed_penalties'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "Registrados leen" on public.%I for select to authenticated using (true)', t);
    execute format('create policy "Staff inserta" on public.%I for insert to authenticated with check ((select public.is_staff()))', t);
    execute format('create policy "Staff actualiza" on public.%I for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()))', t);
    execute format('create policy "Staff borra" on public.%I for delete to authenticated using ((select public.is_staff()))', t);
  end loop;
end;
$$;

-- 5.2 Perfiles: cada uno ve el suyo, el staff ve todos, solo el superadmin cambia roles
alter table public.profiles enable row level security;

create policy "Ver perfil propio o staff" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_staff()));

create policy "Superadmin edita perfiles" on public.profiles
  for update to authenticated
  using ((select public.is_superadmin()))
  with check ((select public.is_superadmin()));

-- 5.3 Votos: nadie (ni el admin) lee votos ajenos desde la app
alter table public.votes enable row level security;

create policy "Jugador ve solo sus votos" on public.votes
  for select to authenticated
  using (voter_id = (select public.current_player_id()));

create policy "Jugador vota" on public.votes
  for insert to authenticated
  with check (public.can_vote(match_id, voter_id, rated_id));

create policy "Jugador cambia su voto mientras está abierto" on public.votes
  for update to authenticated
  using (voter_id = (select public.current_player_id()))
  with check (public.can_vote(match_id, voter_id, rated_id));

-- 5.4 Suscripciones push: cada usuario gestiona las suyas
alter table public.push_subscriptions enable row level security;

create policy "Usuario gestiona sus suscripciones" on public.push_subscriptions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));


-- ---------------------------------------------------------------------
-- 6. ESTADÍSTICAS CALCULADAS
-- ---------------------------------------------------------------------
-- Las medias de votos viven en un esquema 'private' que la API no expone.
-- Al frontend solo le llegan a través de las funciones RPC de abajo,
-- y solo de partidos con la votación ya cerrada.

create schema if not exists private;

-- Media de cada jugador en cada partido (solo votaciones cerradas)
create view private.match_ratings as
select v.match_id,
       v.rated_id as player_id,
       avg(v.score) as rating,
       count(*)     as votes_count
from public.votes v
join public.matches m on m.id = v.match_id
where m.is_finished
  and now() >= m.match_date + interval '7 days'
group by v.match_id, v.rated_id;

-- MVP de cada partido: la mejor media; si hay empate, decide el admin
create view private.match_mvp as
with ranked as (
  select r.match_id, r.player_id,
         rank() over (partition by r.match_id order by r.rating desc) as pos
  from private.match_ratings r
),
top as (
  select match_id, min(player_id) as player_id, count(*) as tied
  from ranked
  where pos = 1
  group by match_id
)
select m.id as match_id,
       coalesce(m.mvp_override_player_id,
                case when t.tied = 1 then t.player_id end) as player_id,
       (m.mvp_override_player_id is null and t.tied > 1)   as needs_tiebreak
from public.matches m
join top t on t.match_id = m.id;


-- 6.1 Lista de la plantilla con totales.
--     p_competition_id = null → suma de todas las competiciones.
create or replace function public.get_squad_stats(
  p_season_id      bigint,
  p_competition_id bigint default null
)
returns table (
  player_id        bigint,
  first_name       text,
  last_name        text,
  nickname         text,
  shirt_number     smallint,
  "position"       public.player_position,
  status           public.player_status,
  photo_path       text,
  is_archived      boolean,
  matches_called   bigint,
  matches_played   bigint,
  minutes          bigint,
  goals            bigint,
  assists          bigint,
  penalty_goals    bigint,
  penalties_missed bigint,
  yellow_cards     bigint,
  red_cards        bigint,
  avg_rating       numeric,
  rated_matches    bigint,
  mvps             bigint,
  goals_conceded   bigint,   -- solo porteros
  clean_sheets     bigint    -- solo porteros
)
language sql stable security definer set search_path = ''
as $$
  with season_matches as (
    select m.id, m.goals_against
    from public.matches m
    where m.season_id = p_season_id
      and m.is_finished
      and (p_competition_id is null or m.competition_id = p_competition_id)
  ),
  squad as (
    select ms.player_id,
           count(*)                                                  as matches_called,
           count(*) filter (where ms.minutes > 0)                    as matches_played,
           sum(ms.minutes)                                           as minutes,
           count(*) filter (where ms.yellow_card)                    as yellow_cards,
           count(*) filter (where ms.red_card)                       as red_cards,
           sum(sm.goals_against) filter (where ms.minutes > 0)       as goals_conceded,
           count(*) filter (where ms.minutes > 0 and sm.goals_against = 0) as clean_sheets
    from public.match_squad ms
    join season_matches sm on sm.id = ms.match_id
    group by ms.player_id
  ),
  scored as (
    select g.scorer_id as player_id,
           count(*)                                    as goals,
           count(*) filter (where g.type <> 'regular') as penalty_goals
    from public.goals g
    join season_matches sm on sm.id = g.match_id
    group by g.scorer_id
  ),
  assisted as (
    select g.assist_id as player_id, count(*) as assists
    from public.goals g
    join season_matches sm on sm.id = g.match_id
    where g.assist_id is not null
    group by g.assist_id
  ),
  missed as (
    select mp.player_id, count(*) as penalties_missed
    from public.missed_penalties mp
    join season_matches sm on sm.id = mp.match_id
    group by mp.player_id
  ),
  ratings as (
    select r.player_id,
           round(avg(r.rating), 2) as avg_rating,   -- cada partido pesa lo mismo
           count(*)                as rated_matches
    from private.match_ratings r
    join season_matches sm on sm.id = r.match_id
    group by r.player_id
  ),
  mvps as (
    select mv.player_id, count(*) as mvps
    from private.match_mvp mv
    join season_matches sm on sm.id = mv.match_id
    where mv.player_id is not null
    group by mv.player_id
  )
  select p.id,
         p.first_name,
         p.last_name,
         p.nickname,
         ps.shirt_number,
         p.position,
         p.status,
         p.photo_path,
         p.archived_at is not null,
         coalesce(s.matches_called, 0),
         coalesce(s.matches_played, 0),
         coalesce(s.minutes, 0),
         coalesce(sc.goals, 0),
         coalesce(a.assists, 0),
         coalesce(sc.penalty_goals, 0),
         coalesce(mi.penalties_missed, 0),
         coalesce(s.yellow_cards, 0),
         coalesce(s.red_cards, 0),
         r.avg_rating,
         coalesce(r.rated_matches, 0),
         coalesce(mv.mvps, 0),
         case when p.position = 'goalkeeper' then coalesce(s.goals_conceded, 0) end,
         case when p.position = 'goalkeeper' then coalesce(s.clean_sheets, 0) end
  from public.player_seasons ps
  join public.players p   on p.id = ps.player_id
  left join squad s       on s.player_id  = p.id
  left join scored sc     on sc.player_id = p.id
  left join assisted a    on a.player_id  = p.id
  left join missed mi     on mi.player_id = p.id
  left join ratings r     on r.player_id  = p.id
  left join mvps mv       on mv.player_id = p.id
  where ps.season_id = p_season_id
  order by ps.shirt_number;
$$;

-- 6.2 Datos de la gráfica de un jugador: nota por partido, media acumulada
--     y media del equipo en ese partido.
create or replace function public.get_player_rating_timeline(
  p_player_id bigint,
  p_season_id bigint
)
returns table (
  match_id         bigint,
  match_date       timestamptz,
  competition_type public.competition_type,
  competition_name text,
  round            smallint,
  opponent         text,
  label            text,      -- 'J5', 'Copa J2', 'Amistoso J1'
  rating           numeric,
  cumulative_avg   numeric,
  team_avg         numeric
)
language sql stable security definer set search_path = ''
as $$
  with team as (
    select r.match_id, avg(r.rating) as team_avg
    from private.match_ratings r
    group by r.match_id
  )
  select m.id,
         m.match_date,
         c.type,
         c.name,
         m.round,
         m.opponent,
         case c.type
           when 'league' then 'J' || m.round
           when 'cup'    then 'Copa J' || m.round
           else               'Amistoso J' || m.round
         end,
         round(r.rating, 2),
         round(avg(r.rating) over (order by m.match_date
                                   rows between unbounded preceding and current row), 2),
         round(t.team_avg, 2)
  from private.match_ratings r
  join public.matches m      on m.id = r.match_id
  join public.competitions c on c.id = m.competition_id
  join team t                on t.match_id = m.id
  where r.player_id = p_player_id
    and m.season_id = p_season_id
  order by m.match_date;
$$;

-- 6.3 MVPs de una temporada (y partidos con empate pendiente para el admin)
create or replace function public.get_season_mvps(p_season_id bigint)
returns table (
  match_id       bigint,
  player_id      bigint,
  needs_tiebreak boolean
)
language sql stable security definer set search_path = ''
as $$
  select mv.match_id, mv.player_id, mv.needs_tiebreak
  from private.match_mvp mv
  join public.matches m on m.id = mv.match_id
  where m.season_id = p_season_id
  order by m.match_date;
$$;

-- Solo usuarios registrados pueden llamar a las funciones
revoke execute on function public.get_squad_stats(bigint, bigint)            from public, anon;
revoke execute on function public.get_player_rating_timeline(bigint, bigint) from public, anon;
revoke execute on function public.get_season_mvps(bigint)                    from public, anon;
grant  execute on function public.get_squad_stats(bigint, bigint)            to authenticated;
grant  execute on function public.get_player_rating_timeline(bigint, bigint) to authenticated;
grant  execute on function public.get_season_mvps(bigint)                    to authenticated;


-- ---------------------------------------------------------------------
-- 7. STORAGE: fotos de jugadores
-- ---------------------------------------------------------------------
-- Bucket público para leer (URL directa en <img>), escritura solo staff.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('player-photos', 'player-photos', true, 2097152,  -- 2 MB
        array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "Staff sube fotos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'player-photos' and (select public.is_staff()));

create policy "Staff cambia fotos" on storage.objects
  for update to authenticated
  using (bucket_id = 'player-photos' and (select public.is_staff()))
  with check (bucket_id = 'player-photos' and (select public.is_staff()));

create policy "Staff borra fotos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'player-photos' and (select public.is_staff()));


-- ---------------------------------------------------------------------
-- 8. DESPUÉS DE TU PRIMER LOGIN (ejecutar a mano en el SQL Editor):
-- ---------------------------------------------------------------------
-- update public.profiles set role = 'superadmin' where email = 'TU_CORREO';
