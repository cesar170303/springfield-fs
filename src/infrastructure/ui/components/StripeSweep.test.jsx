import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { gsap } from 'gsap'
import StripeSweep from './StripeSweep'

function deviceReducesMotion(reduce) {
  vi.stubGlobal('matchMedia', (query) => ({
    matches: query.includes('no-preference') ? !reduce : reduce,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }))
}

function spyOnCanvas() {
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(375)
  vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(700)
  const ctx = new Proxy(
    { clearRect: vi.fn(), stroke: vi.fn() },
    { get: (t, p) => t[p] ?? (() => {}), set: (t, p, v) => ((t[p] = v), true) },
  )
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx)
  return ctx
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('StripeSweep', () => {
  it('es decorativo: el lector de pantalla no lo anuncia', () => {
    const { container } = render(<StripeSweep />)
    expect(container.querySelector('canvas')).toHaveAttribute('aria-hidden', 'true')
  })

  it('con movimiento, las rayitas barren la pantalla y se paran solas en menos de 5 s', () => {
    deviceReducesMotion(false)
    const ctx = spyOnCanvas()
    const add = vi.spyOn(gsap.ticker, 'add')
    const remove = vi.spyOn(gsap.ticker, 'remove')
    const now = vi.spyOn(performance, 'now').mockReturnValue(0)
    render(<StripeSweep />)

    const tick = add.mock.calls.at(-1)[0]
    // gsap.ticker.add ya llama a remove por dentro (para no apuntar dos veces la misma función): se cuenta desde aquí.
    remove.mockClear()
    now.mockReturnValue(500)
    tick()
    expect(ctx.stroke).toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()

    now.mockReturnValue(4000)
    tick()
    expect(remove).toHaveBeenCalledWith(tick)
  })

  it('con «reducir movimiento», no se mueve nada', () => {
    deviceReducesMotion(true)
    spyOnCanvas()
    const add = vi.spyOn(gsap.ticker, 'add')
    render(<StripeSweep />)

    expect(add).not.toHaveBeenCalled()
  })
})
