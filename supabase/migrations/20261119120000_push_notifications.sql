-- =====================================================================
-- Notificaciones push de la votación (docs/SPEC.md §8)
--
-- Tres avisos por partido, cada uno una sola vez:
--   voting_open      al terminar el partido, a los votantes de la temporada
--   voting_reminder  entre el día 6 y el 7, a quien le falte algún compañero
--   voting_closed    al cerrarse (día 7, hasta 24 h después), el MVP a todos
-- Una tarea programada llama a la Edge Function `send-push`, que pide los
-- pendientes con claim_pending_notifications() y los envía.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Registro de avisos ya enviados (fuera de la API)
-- ---------------------------------------------------------------------
create table private.notifications_sent (
  match_id bigint not null references public.matches (id) on delete cascade,
  kind     text   not null check (kind in ('voting_open', 'voting_reminder', 'voting_closed')),
  sent_at  timestamptz not null default now(),
  primary key (match_id, kind)
);


-- ---------------------------------------------------------------------
-- 2. Votantes de un partido: plantilla no archivada con cuenta + viewers elegidos
-- ---------------------------------------------------------------------
create function private.match_voters(p_match_id bigint)
returns table (user_id uuid)
language sql stable set search_path = ''
as $$
  select p.user_id
  from public.matches m
  join public.player_seasons ps on ps.season_id = m.season_id
  join public.players p         on p.id = ps.player_id
  where m.id = p_match_id and p.user_id is not null and p.archived_at is null
  union
  select sv.user_id
  from public.matches m
  join public.season_voters sv on sv.season_id = m.season_id
  where m.id = p_match_id;
$$;

-- Votantes a los que les falta algún compañero por votar (solo mira SI votó, nunca la nota).
create function private.match_pending_voters(p_match_id bigint)
returns table (user_id uuid)
language sql stable set search_path = ''
as $$
  select v.user_id
  from private.match_voters(p_match_id) v
  where exists (
    select 1
    from public.match_squad ms
    join public.players rated on rated.id = ms.player_id
    where ms.match_id = p_match_id
      and ms.minutes > 0
      and rated.user_id is distinct from v.user_id           -- sin contarse a sí mismo
      and not exists (select 1 from public.votes vo
                      where vo.match_id = p_match_id and vo.voter_id = v.user_id and vo.rated_id = ms.player_id));
$$;


-- ---------------------------------------------------------------------
-- 3. Avisos pendientes: los devuelve y los marca como enviados en el mismo paso,
--    así dos ejecuciones seguidas nunca envían el mismo aviso.
-- ---------------------------------------------------------------------
create function public.claim_pending_notifications()
returns table (
  kind            text,
  match_id        bigint,
  user_id         uuid,
  title           text,
  body            text,
  subscription_id bigint,
  endpoint        text,
  p256dh          text,
  auth            text
)
language plpgsql security definer set search_path = ''
as $$
begin
  return query
  with due as (
    select m.id as match_id, k.kind, m.opponent
    from public.matches m
    cross join (values ('voting_open'), ('voting_reminder'), ('voting_closed')) k(kind)
    where m.is_finished
      and case k.kind
            when 'voting_open'     then now() < m.match_date + interval '7 days'
            when 'voting_reminder' then now() >= m.match_date + interval '6 days' and now() < m.match_date + interval '7 days'
            when 'voting_closed'   then now() >= m.match_date + interval '7 days' and now() < m.match_date + interval '8 days'
          end
      and not exists (select 1 from private.notifications_sent s where s.match_id = m.id and s.kind = k.kind)
  ),
  claimed as (
    insert into private.notifications_sent (match_id, kind)
    select d.match_id, d.kind from due d
    on conflict do nothing
    returning notifications_sent.match_id, notifications_sent.kind
  ),
  recipients as (
    select c.match_id, c.kind, r.user_id
    from claimed c
    cross join lateral (
      select v.user_id from private.match_voters(c.match_id) v          where c.kind = 'voting_open'
      union
      select v.user_id from private.match_pending_voters(c.match_id) v  where c.kind = 'voting_reminder'
      union
      select p.id      from public.profiles p                           where c.kind = 'voting_closed'
    ) r
  )
  select r.kind,
         r.match_id,
         r.user_id,
         case r.kind
           when 'voting_open'     then 'Votación abierta'
           when 'voting_reminder' then 'Queda 1 día para votar'
           else coalesce(mvp_name.name || ', MVP del partido', 'Votación cerrada')
         end,
         case r.kind
           when 'voting_open'     then 'Ya puedes votar a tus compañeros del partido contra ' || d.opponent || '.'
           when 'voting_reminder' then 'Te falta votar a algún compañero del partido contra ' || d.opponent || '.'
           else coalesce(mvp_name.name || ' es el MVP del partido contra ' || d.opponent || '.',
                         'Ya están las notas del partido contra ' || d.opponent || '.')
         end,
         s.id,
         s.endpoint,
         s.p256dh,
         s.auth
  from recipients r
  join due d on d.match_id = r.match_id and d.kind = r.kind
  join public.push_subscriptions s on s.user_id = r.user_id
  left join lateral (
    select coalesce(pl.nickname, pl.first_name) as name
    from private.match_mvp mv
    join public.players pl on pl.id = mv.player_id
    where mv.match_id = r.match_id
  ) mvp_name on r.kind = 'voting_closed';
end;
$$;

revoke execute on function public.claim_pending_notifications() from public, anon, authenticated;
grant  execute on function public.claim_pending_notifications() to service_role;


-- ---------------------------------------------------------------------
-- 4. Tarea programada: cada 15 minutos llama a la Edge Function.
--    La URL y la clave secreta se guardan en Vault a mano, una vez por proyecto
--    (nunca en el repo):
--      select vault.create_secret('https://<ref>.supabase.co', 'project_url');
--      select vault.create_secret('<clave secreta>', 'secret_key');
-- ---------------------------------------------------------------------
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'send-push-notifications',
  '*/15 * * * *',
  $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'secret_key')
    ),
    body    := '{}'::jsonb
  );
  $$
);
