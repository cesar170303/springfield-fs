// Edge Function send-push: la llama la tarea programada `send-push-notifications` (pg_cron) cada 15 minutos.
// Pide los avisos pendientes a la base de datos y los envía por Web Push.
//
// Secrets necesarios (se configuran en Supabase, nunca en el repo):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY  claves VAPID (npx web-push generate-vapid-keys)
//   VAPID_SUBJECT                        contacto del remitente: "mailto:..." o una URL
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase.
import { createClient } from 'npm:@supabase/supabase-js@2.119.0'
import webpush from 'npm:web-push@3.6.7'
import { deliverAll, isAuthorized, type PendingNotification } from './deliver.ts'

const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey)

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? '',
  Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
  Deno.env.get('VAPID_PRIVATE_KEY') ?? '',
)

Deno.serve(async (req) => {
  if (!isAuthorized(req, serviceKey)) return new Response('Unauthorized', { status: 401 })

  const { data, error } = await supabase.rpc('claim_pending_notifications')
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const result = await deliverAll(
    (data ?? []) as PendingNotification[],
    (subscription, payload) => webpush.sendNotification(subscription, payload),
    (id) => supabase.from('push_subscriptions').delete().eq('id', id),
  )
  return Response.json(result)
})
