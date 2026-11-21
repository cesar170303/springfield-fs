import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { gsap } from 'gsap'
import StripeField from './StripeField'

// jsdom no sabe si el dispositivo pide reducir movimiento: cada test se lo dice falseando matchMedia.
function deviceReducesMotion(reduce) {
  vi.stubGlobal('matchMedia', (query) => ({
    matches: query.includes('no-preference') ? !reduce : reduce,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }))
}

// jsdom no dibuja ni mide: un canvas de móvil (375×420) con un contexto 2D falso que cuenta los fotogramas,
// porque cada uno empieza borrando el anterior con clearRect.
function spyOnCanvas() {
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(375)
  vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(420)
  const ctx = new Proxy(
    { clearRect: vi.fn(), createLinearGradient: () => ({ addColorStop() {} }) },
    {
      get: (target, prop) => target[prop] ?? (() => {}),
      set: (target, prop, value) => ((target[prop] = value), true),
    },
  )
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx)
  return ctx
}

// Monta el campo con movimiento y devuelve la función que GSAP llama en cada fotograma.
function renderMoving() {
  deviceReducesMotion(false)
  const ctx = spyOnCanvas()
  const add = vi.spyOn(gsap.ticker, 'add')
  const view = render(<StripeField />)
  expect(add).toHaveBeenCalledTimes(1)
  return { ...view, ctx, tick: add.mock.calls[0][0] }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('StripeField', () => {
  it('es decorativo: el lector de pantalla no lo anuncia', () => {
    const { container } = render(<StripeField />)

    expect(container.querySelector('canvas')).toHaveAttribute('aria-hidden', 'true')
  })

  it('con «reducir movimiento», dibuja las rayas quietas y no ofrece pausa', () => {
    deviceReducesMotion(true)
    const ctx = spyOnCanvas()
    const add = vi.spyOn(gsap.ticker, 'add')
    render(<StripeField />)

    expect(ctx.clearRect).toHaveBeenCalledTimes(1) // un único fotograma: el estado final
    expect(add).not.toHaveBeenCalled()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('sin esa preferencia, las rayas se redibujan en cada fotograma', () => {
    const { ctx, tick } = renderMoving()
    ctx.clearRect.mockClear()

    tick(1, 16)

    expect(ctx.clearRect).toHaveBeenCalledTimes(1)
  })

  it('el botón pausa y reanuda el movimiento (WCAG 2.2.2)', async () => {
    const { ctx, tick } = renderMoving()

    await userEvent.click(screen.getByRole('button', { name: 'Pausar la animación' }))
    ctx.clearRect.mockClear()
    tick(2, 16)
    expect(ctx.clearRect).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Reanudar la animación' }))
    tick(3, 16)
    expect(ctx.clearRect).toHaveBeenCalled()
  })

  it('al salir de la pantalla, deja de dibujar', () => {
    const remove = vi.spyOn(gsap.ticker, 'remove')
    const { tick, unmount } = renderMoving()

    unmount()

    expect(remove).toHaveBeenCalledWith(tick)
  })
})
