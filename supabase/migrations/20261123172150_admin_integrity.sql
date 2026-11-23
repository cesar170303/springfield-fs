-- =====================================================================
-- Integridad para el panel de admin (docs/SPEC.md §9 y §12)
--
-- El staff corrige partidos, pero nunca a costa de votos ya emitidos ni de cifras ya registradas.
-- Las funciones de los triggers son `security definer` porque tienen que ver los votos, que RLS oculta también
-- al staff. Viven en `private`, que la API no expone, y nadie puede ejecutarlas directamente.
-- Sus mensajes los enseña la app tal cual.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Garantía de fondo: ningún borrado arrastra votos (antes, ON DELETE CASCADE).
--    Los triggers de abajo dan la frase; esto cubre además un voto y un borrado simultáneos.
-- ---------------------------------------------------------------------
alter table public.votes
  drop constraint votes_match_id_fkey,
  add constraint votes_match_id_fkey foreign key (match_id) references public.matches (id) on delete restrict,
  drop constraint votes_match_id_rated_id_fkey,
  add constraint votes_match_id_rated_id_fkey foreign key (match_id, rated_id)
    references public.match_squad (match_id, player_id) on delete restrict;


-- ---------------------------------------------------------------------
-- 2. Partidos
-- ---------------------------------------------------------------------
create function private.protect_voted_match()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if exists (select 1 from public.votes v where v.match_id = old.id) then
    if tg_op = 'DELETE' then
      raise exception 'No se puede borrar un partido que ya tiene votos';
    end if;
    if old.is_finished and not new.is_finished then
      raise exception 'No se puede reabrir un partido que ya tiene votos';
    end if;
    -- Reabrir una votación cerrada rompería el anonimato: las medias ya se han visto.
    if now() >= old.match_date + interval '7 days' and now() < new.match_date + interval '7 days' then
      raise exception 'La votación de este partido ya se cerró: esa fecha la volvería a abrir';
    end if;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger matches_protect_votes
  before update or delete on public.matches
  for each row execute function private.protect_voted_match();

create function private.validate_match()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.is_finished and new.match_date > now() then
    raise exception 'Un partido terminado no puede tener una fecha futura';
  end if;

  -- El MVP a mano solo desempata: match_ratings solo tiene partidos con la votación cerrada.
  if new.mvp_override_player_id is not null
     and (tg_op = 'INSERT' or new.mvp_override_player_id is distinct from old.mvp_override_player_id)
     and not exists (
       select 1
       from private.match_ratings r
       where r.match_id = new.id
         and r.player_id = new.mvp_override_player_id
         and r.rating = (select max(top.rating) from private.match_ratings top where top.match_id = new.id)
     ) then
    raise exception 'El MVP tiene que ser uno de los jugadores con la mejor media, con la votación cerrada';
  end if;
  return new;
end;
$$;

create trigger matches_validate
  before insert or update on public.matches
  for each row execute function private.validate_match();


-- ---------------------------------------------------------------------
-- 3. Convocatoria
-- ---------------------------------------------------------------------
create function private.player_name(p_player_id bigint)
returns text
language sql stable set search_path = ''
as $$
  -- Sin ficha (se está borrando en cascada), un nombre genérico.
  select coalesce((select coalesce(nullif(p.nickname, ''), p.first_name) from public.players p where p.id = p_player_id), 'Este jugador');
$$;

create function private.protect_squad_player()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_has_votes boolean := exists (
    select 1 from public.votes v where v.match_id = old.match_id and v.rated_id = old.player_id);
begin
  if tg_op = 'DELETE' then
    if v_has_votes then
      raise exception '% ya tiene votos en este partido: no se puede quitar de la convocatoria', private.player_name(old.player_id);
    end if;
    return old;
  end if;

  if old.minutes > 0 and new.minutes = 0 then
    if v_has_votes then
      raise exception '% ya tiene votos en este partido: no se le puede dejar a 0 minutos', private.player_name(old.player_id);
    end if;
    if exists (select 1 from public.goals g
               where g.match_id = old.match_id and old.player_id in (g.scorer_id, g.assist_id)) then
      raise exception '% tiene goles o asistencias en este partido: bórralos antes de dejarle a 0 minutos', private.player_name(old.player_id);
    end if;
  end if;
  return new;
end;
$$;

create trigger match_squad_protect_player
  before update of minutes or delete on public.match_squad
  for each row execute function private.protect_squad_player();


-- ---------------------------------------------------------------------
-- 4. Plantilla: quitar a un convocado haría desaparecer sus cifras de la lista.
-- ---------------------------------------------------------------------
create function private.protect_roster_player()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if exists (select 1
             from public.match_squad ms
             join public.matches m on m.id = ms.match_id
             where m.season_id = old.season_id and ms.player_id = old.player_id) then
    raise exception '% ya fue convocado esta temporada: no se puede quitar de la plantilla', private.player_name(old.player_id);
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger player_seasons_protect_delete
  before delete on public.player_seasons
  for each row execute function private.protect_roster_player();

create trigger player_seasons_protect_update
  before update of season_id, player_id on public.player_seasons
  for each row
  when (old.season_id is distinct from new.season_id or old.player_id is distinct from new.player_id)
  execute function private.protect_roster_player();

revoke execute on function private.protect_voted_match()   from public, anon, authenticated;
revoke execute on function private.validate_match()        from public, anon, authenticated;
revoke execute on function private.player_name(bigint)     from public, anon, authenticated;
revoke execute on function private.protect_squad_player()  from public, anon, authenticated;
revoke execute on function private.protect_roster_player() from public, anon, authenticated;


-- ---------------------------------------------------------------------
-- 5. Empates de MVP: los empatados en cabeza de cada partido con la votación cerrada (solo staff).
-- ---------------------------------------------------------------------
create function public.get_mvp_ties(p_season_id bigint)
returns table (match_id bigint, player_id bigint, rating numeric)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not rls.is_staff() then
    raise exception 'Solo el staff puede ver los empates de MVP' using errcode = '42501';
  end if;
  return query
  with ranked as (
    select r.match_id, r.player_id, r.rating,
           rank() over (partition by r.match_id order by r.rating desc) as pos
    from private.match_ratings r
    join public.matches m on m.id = r.match_id
    where m.season_id = p_season_id
  ),
  top as (
    select k.match_id, k.player_id, k.rating, count(*) over (partition by k.match_id) as tied
    from ranked k
    where k.pos = 1
  )
  select t.match_id, t.player_id, round(t.rating, 2)
  from top t
  where t.tied > 1
  order by t.match_id, t.player_id;
end;
$$;

revoke execute on function public.get_mvp_ties(bigint) from public, anon;
grant  execute on function public.get_mvp_ties(bigint) to authenticated;
