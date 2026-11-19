import { describe, expect, it, vi } from 'vitest'
import { deliverAll, isAuthorized } from './deliver.ts'

const row = (overrides = {}) => ({
  kind: 'voting_open',
  match_id: 1,
  user_id: 'u1',
  title: 'Votación abierta',
  body: 'Ya puedes votar a tus compañeros del partido contra Rival 1.',
  subscription_id: 10,
  endpoint: 'https://push.example.com/abc',
  p256dh: 'p256dh-test',
  auth: 'auth-test',
  ...overrides,
})

describe('deliverAll', () => {
  it('envía a cada suscripción el título, el texto y de qué partido es', async () => {
    const send = vi.fn().mockResolvedValue(undefined)
    const result = await deliverAll([row()], send, vi.fn())

    expect(send).toHaveBeenCalledWith(
      { endpoint: 'https://push.example.com/abc', keys: { p256dh: 'p256dh-test', auth: 'auth-test' } },
      JSON.stringify({
        title: 'Votación abierta',
        body: 'Ya puedes votar a tus compañeros del partido contra Rival 1.',
        kind: 'voting_open',
        matchId: 1,
      }),
    )
    expect(result).toEqual({ sent: 1, failed: 0, removed: 0 })
  })

  it('borra las suscripciones caducadas (404 o 410) y sigue con las demás', async () => {
    const send = vi
      .fn()
      .mockRejectedValueOnce({ statusCode: 410 })
      .mockRejectedValueOnce({ statusCode: 404 })
      .mockResolvedValueOnce(undefined)
    const remove = vi.fn().mockResolvedValue(undefined)

    const result = await deliverAll(
      [row({ subscription_id: 1 }), row({ subscription_id: 2 }), row({ subscription_id: 3 })],
      send,
      remove,
    )

    expect(remove.mock.calls).toEqual([[1], [2]])
    expect(result).toEqual({ sent: 1, failed: 0, removed: 2 })
  })

  it('un fallo cualquiera no borra la suscripción ni corta el envío al resto', async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce(undefined)
    const remove = vi.fn()

    const result = await deliverAll([row({ subscription_id: 1 }), row({ subscription_id: 2 })], send, remove)

    expect(remove).not.toHaveBeenCalled()
    expect(result).toEqual({ sent: 1, failed: 1, removed: 0 })
  })
})

describe('isAuthorized', () => {
  it('acepta solo la clave secreta exacta en la cabecera apikey', () => {
    const req = (apikey?: string) =>
      new Request('http://localhost/functions/v1/send-push', {
        method: 'POST',
        headers: apikey ? { apikey } : {},
      })

    expect(isAuthorized(req('clave-secreta'), 'clave-secreta')).toBe(true)
    expect(isAuthorized(req('otra'), 'clave-secreta')).toBe(false)
    expect(isAuthorized(req('clave-secret'), 'clave-secreta')).toBe(false)
    expect(isAuthorized(req(), 'clave-secreta')).toBe(false)
    expect(isAuthorized(req(''), '')).toBe(false)
  })
})
