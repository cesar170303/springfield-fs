-- =====================================================================
-- pg_net en el esquema `extensions`
--
-- La migración de notificaciones push (20261119120000) creó pg_net sin indicar
-- esquema, así que quedó en `public` (aviso «Extension in Public» del analizador
-- de seguridad de Supabase). pg_net no se puede cambiar de esquema en el sitio,
-- así que se reinstala en `extensions`, solo si estaba en `public`.
-- Sus funciones siguen en el esquema `net` (net.http_post), que es lo que usa la
-- tarea programada send-push-notifications: no hay que tocarla.
-- =====================================================================

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_net' and extnamespace = 'public'::regnamespace) then
    drop extension pg_net;
  end if;
end $$;

create extension if not exists pg_net with schema extensions;
