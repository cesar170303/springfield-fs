-- =====================================================================
-- Funciones auxiliares de RLS fuera de la API
--
-- app_role, is_staff, is_superadmin y can_vote solo las usan las políticas
-- RLS por dentro. En `public` cualquier usuario con sesión podía llamarlas por
-- /rest/v1/rpc/... (aviso del analizador de seguridad de Supabase). Pasan al
-- esquema `rls`, que la API no expone. Mismo comportamiento.
--
-- No se usa `private` porque las políticas se evalúan con el rol del usuario,
-- que necesita permiso de uso del esquema: `rls` solo contiene estas funciones.
-- =====================================================================

create schema rls;
grant usage on schema rls to authenticated;

-- Las políticas guardan la función por su identificador interno: siguen funcionando tras moverla.
alter function public.app_role()                        set schema rls;
alter function public.is_staff()                        set schema rls;
alter function public.is_superadmin()                   set schema rls;
alter function public.can_vote(bigint, uuid, bigint)    set schema rls;

-- Los cuerpos sí nombran otras funciones (se resuelven al ejecutarse): se rehacen.
create or replace function rls.is_staff()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(rls.app_role() in ('superadmin', 'admin'), false);
$$;

create or replace function rls.is_superadmin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(rls.app_role() = 'superadmin', false);
$$;

create or replace function public.get_player_emails()
returns table (player_id bigint, email text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not rls.is_staff() then
    raise exception 'Solo el staff puede ver los correos de los jugadores' using errcode = '42501';
  end if;
  return query select p.id, p.email from public.players p order by p.id;
end;
$$;

-- Solo las ejecuta el usuario con sesión (al evaluarse sus políticas).
revoke execute on all functions in schema rls from public, anon;
grant  execute on all functions in schema rls to authenticated;
