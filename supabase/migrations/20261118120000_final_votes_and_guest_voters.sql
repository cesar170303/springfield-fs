-- =====================================================================
-- Voto definitivo y viewers votantes por temporada (docs/SPEC.md §2 y §6)
--
-- * Cada voto, una vez emitido, no se cambia ni se borra.
-- * El staff elige, por temporada, qué viewers pueden votar (season_voters).
-- * Por eso el votante pasa a ser la CUENTA (profiles.id) y no la ficha de
--   jugador: un viewer no tiene ficha.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Viewers votantes por temporada
-- ---------------------------------------------------------------------
create table public.season_voters (
  season_id  bigint not null references public.seasons (id) on delete cascade,
  user_id    uuid   not null references public.profiles (id) on delete cascade,
  added_by   uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (season_id, user_id)
);
create index season_voters_user_idx on public.season_voters (user_id);

alter table public.season_voters enable row level security;

create policy "Staff y el propio votante leen" on public.season_voters
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));

create policy "Staff elige votantes" on public.season_voters
  for insert to authenticated
  with check ((select public.is_staff()));

create policy "Staff quita votantes" on public.season_voters
  for delete to authenticated
  using ((select public.is_staff()));


-- ---------------------------------------------------------------------
-- 2. votes.voter_id: de ficha de jugador (bigint) a cuenta (uuid)
-- ---------------------------------------------------------------------
drop policy "Jugador ve solo sus votos" on public.votes;
drop policy "Jugador vota" on public.votes;
drop policy "Jugador cambia su voto mientras está abierto" on public.votes;
drop function public.can_vote(bigint, bigint, bigint);

-- Un voto ya no se modifica: fuera el trigger y la columna de última edición.
drop trigger votes_set_updated_at on public.votes;
drop function public.set_updated_at();
alter table public.votes drop column updated_at;

-- Si hubiera votos de una ficha sin cuenta vinculada no se podrían convertir: mejor parar que perderlos.
do $$
begin
  if exists (select 1 from public.votes v join public.players p on p.id = v.voter_id where p.user_id is null) then
    raise exception 'Hay votos de fichas sin cuenta vinculada; revísalos antes de aplicar esta migración';
  end if;
end $$;

alter table public.votes add column voter_user_id uuid;
update public.votes v set voter_user_id = p.user_id from public.players p where p.id = v.voter_id;

alter table public.votes drop constraint votes_pkey;
alter table public.votes drop constraint votes_check;          -- sin autovoto: ahora lo comprueba can_vote()
alter table public.votes drop constraint votes_voter_id_fkey;
alter table public.votes drop column voter_id;
alter table public.votes rename column voter_user_id to voter_id;
alter table public.votes
  alter column voter_id set not null,
  alter column voter_id set default auth.uid(),
  add constraint votes_voter_id_fkey foreign key (voter_id) references public.profiles (id) on delete cascade,
  add primary key (match_id, voter_id, rated_id);


-- ---------------------------------------------------------------------
-- 3. ¿Puede esta cuenta puntuar a este jugador en este partido?
-- ---------------------------------------------------------------------
create function public.can_vote(p_match_id bigint, p_voter_id uuid, p_rated_id bigint)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
        -- se vota en nombre propio
        p_voter_id = auth.uid()
    -- partido terminado, votación abierta (7 días) y el votante es de esa temporada:
    -- jugador de la plantilla no archivado, o viewer elegido por el staff
    and exists (
          select 1
          from public.matches m
          where m.id = p_match_id
            and m.is_finished
            and now() < m.match_date + interval '7 days'
            and (exists (select 1
                         from public.players p
                         join public.player_seasons ps on ps.player_id = p.id and ps.season_id = m.season_id
                         where p.user_id = p_voter_id and p.archived_at is null)
                 or exists (select 1
                            from public.season_voters sv
                            where sv.season_id = m.season_id and sv.user_id = p_voter_id)))
    -- el votado jugó al menos un minuto
    and exists (
          select 1 from public.match_squad ms
          where ms.match_id = p_match_id and ms.player_id = p_rated_id and ms.minutes > 0)
    -- sin autovoto
    and not exists (
          select 1 from public.players p
          where p.id = p_rated_id and p.user_id = p_voter_id),
    false);
$$;

revoke execute on function public.can_vote(bigint, uuid, bigint) from public, anon;
grant  execute on function public.can_vote(bigint, uuid, bigint) to authenticated;


-- ---------------------------------------------------------------------
-- 4. Políticas de votos: ver los propios y votar. Sin update ni delete.
-- ---------------------------------------------------------------------
create policy "Cada cuenta ve solo sus votos" on public.votes
  for select to authenticated
  using (voter_id = (select auth.uid()));

create policy "Votar" on public.votes
  for insert to authenticated
  with check (public.can_vote(match_id, voter_id, rated_id));

-- Además de no tener política, se quita el permiso: cambiar o borrar un voto falla siempre.
revoke update, delete, truncate on public.votes from anon, authenticated;
