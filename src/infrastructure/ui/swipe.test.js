import { describe, expect, it } from 'vitest'
import { swipeDecision, SWIPE_THRESHOLD } from './swipe'

describe('swipeDecision', () => {
  const width = 360

  it('a la derecha, pasado el umbral, vota', () => {
    expect(swipeDecision(width * SWIPE_THRESHOLD + 1, width)).toBe('vote')
  })

  it('a la izquierda, pasado el umbral, salta', () => {
    expect(swipeDecision(-width * SWIPE_THRESHOLD - 1, width)).toBe('skip')
  })

  it('si se suelta antes del umbral, nada: la tarjeta vuelve a su sitio', () => {
    expect(swipeDecision(width * SWIPE_THRESHOLD - 1, width)).toBeNull()
    expect(swipeDecision(-20, width)).toBeNull()
    expect(swipeDecision(0, width)).toBeNull()
  })

  it('la fuerza del sello va de 0 a 1 según lo cerca que está del umbral', async () => {
    const { swipeProgress } = await import('./swipe')
    expect(swipeProgress(0, width)).toBe(0)
    expect(swipeProgress((width * SWIPE_THRESHOLD) / 2, width)).toBeCloseTo(0.5)
    expect(swipeProgress(-width, width)).toBe(-1)
    expect(swipeProgress(width, width)).toBe(1)
  })
})
