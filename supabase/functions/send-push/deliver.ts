// Lógica de envío de la Edge Function send-push, sin dependencias de Deno ni de npm
// para poder probarla con Vitest (deliver.test.ts).

/** Una fila de public.claim_pending_notifications(): un aviso para un dispositivo. */
export type PendingNotification = {
  kind: string
  match_id: number
  user_id: string
  title: string
  body: string
  subscription_id: number
  endpoint: string
  p256dh: string
  auth: string
}

export type PushSubscription = { endpoint: string; keys: { p256dh: string; auth: string } }
export type SendFn = (subscription: PushSubscription, payload: string) => Promise<unknown>
export type RemoveFn = (subscriptionId: number) => Promise<unknown>

// El servicio push responde 404/410 cuando el usuario quitó el permiso o el dispositivo ya no existe.
const EXPIRED = new Set([404, 410])

export async function deliverAll(rows: PendingNotification[], send: SendFn, removeSubscription: RemoveFn) {
  const result = { sent: 0, failed: 0, removed: 0 }
  for (const row of rows) {
    try {
      await send(
        { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
        JSON.stringify({ title: row.title, body: row.body, kind: row.kind, matchId: row.match_id }),
      )
      result.sent++
    } catch (error) {
      if (EXPIRED.has((error as { statusCode?: number })?.statusCode ?? 0)) {
        await removeSubscription(row.subscription_id)
        result.removed++
      } else {
        result.failed++
      }
    }
  }
  return result
}

// Solo la tarea programada (que envía la clave secreta en `apikey`) puede lanzar el envío.
export function isAuthorized(req: Request, secret: string) {
  const given = req.headers.get('apikey') ?? ''
  if (!secret || given.length !== secret.length) return false
  let diff = 0
  for (let i = 0; i < secret.length; i++) diff |= given.charCodeAt(i) ^ secret.charCodeAt(i)
  return diff === 0
}
