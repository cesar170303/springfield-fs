-- =====================================================================
-- Endurecimiento tras la auditoría de seguridad de noviembre de 2026
-- (docs/security/2026-11-auditoria.md, hallazgos 1, 2, 3, 5, 6 y 7)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Hallazgo 1: el correo de los jugadores solo lo ve el staff.
-- Permisos por columna: se puede leer toda la ficha menos `email`.
-- ---------------------------------------------------------------------
revoke select on public.players from anon, authenticated;
grant select (id, first_name, last_name, nickname, user_id, position, status, photo_path, archived_at, created_at)
  on public.players to authenticated;

create function public.get_player_emails()
returns table (player_id bigint, email text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Solo el staff puede ver los correos de los jugadores' using errcode = '42501';
  end if;
  return query select p.id, p.email from public.players p order by p.id;
end;
$$;

revoke execute on function public.get_player_emails() from public, anon;
grant  execute on function public.get_player_emails() to authenticated;


-- ---------------------------------------------------------------------
-- Hallazgo 2: la ficha solo se vincula a cuentas con el correo confirmado.
-- ---------------------------------------------------------------------
create function private.link_account_to_player(p_user_id uuid, p_email text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_linked int;
begin
  update public.players
     set user_id = p_user_id
   where email = lower(p_email) and user_id is null;
  get diagnostics v_linked = row_count;

  if v_linked > 0 then
    update public.profiles set role = 'player' where id = p_user_id and role = 'viewer';
  end if;
end;
$$;

-- Al registrarse: siempre se crea el perfil, pero la ficha solo se vincula si el correo
-- ya viene confirmado (p. ej. con Google).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  );

  if new.email_confirmed_at is not null then
    perform private.link_account_to_player(new.id, new.email);
  end if;

  return new;
end;
$$;

-- Al confirmar el correo más tarde.
create function public.handle_user_confirmed()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform private.link_account_to_player(new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.handle_user_confirmed();

-- Si el admin crea la ficha después: solo se vincula a una cuenta confirmada.
create or replace function public.link_player_to_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.email := lower(new.email);
  if new.email is not null and new.user_id is null then
    select p.id into new.user_id
      from public.profiles p
      join auth.users u on u.id = p.id
     where p.email = new.email and u.email_confirmed_at is not null;
    if new.user_id is not null then
      update public.profiles set role = 'player' where id = new.user_id and role = 'viewer';
    end if;
  end if;
  return new;
end;
$$;


-- ---------------------------------------------------------------------
-- Hallazgo 3: sin política de lectura, el staff no podía cambiar ni borrar fotos.
-- (Las fotos se siguen viendo por URL pública: el bucket es público por decisión de producto.)
-- ---------------------------------------------------------------------
create policy "Staff ve fotos" on storage.objects
  for select to authenticated
  using (bucket_id = 'player-photos' and (select public.is_staff()));


-- ---------------------------------------------------------------------
-- Hallazgo 5: una cuenta con votos no se puede borrar (las medias cerradas no cambian).
-- ---------------------------------------------------------------------
alter table public.votes drop constraint votes_voter_id_fkey;
alter table public.votes
  add constraint votes_voter_id_fkey foreign key (voter_id) references public.profiles (id) on delete restrict;


-- ---------------------------------------------------------------------
-- Hallazgo 6: la API no necesita TRUNCATE (se salta RLS), TRIGGER ni REFERENCES.
-- ---------------------------------------------------------------------
revoke truncate, trigger, references on all tables in schema public from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke truncate, trigger, references on tables from anon, authenticated;


-- ---------------------------------------------------------------------
-- Hallazgo 7: funciones auxiliares fuera del alcance de anónimos; fuera la que no se usa.
-- ---------------------------------------------------------------------
drop function public.current_player_id();

revoke execute on function public.app_role()      from public, anon;
revoke execute on function public.is_staff()      from public, anon;
revoke execute on function public.is_superadmin() from public, anon;
grant  execute on function public.app_role()      to authenticated;
grant  execute on function public.is_staff()      to authenticated;
grant  execute on function public.is_superadmin() to authenticated;

-- Funciones de trigger: nadie las llama directamente.
revoke execute on function public.handle_new_user()       from public, anon, authenticated;
revoke execute on function public.handle_user_confirmed() from public, anon, authenticated;
revoke execute on function public.link_player_to_user()   from public, anon, authenticated;
revoke execute on function private.link_account_to_player(uuid, text) from public, anon, authenticated;
