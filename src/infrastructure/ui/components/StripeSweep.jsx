import { useRef } from 'react'
import { gsap, useMotion } from '../motion'

// Portada y final de la votación (docs/SPEC.md §11): rayitas verticales que suben barriendo la pantalla de izquierda
// a derecha, grises y alguna en azul (el motivo del escudo). Dura menos de 2,5 s y se queda quieto: no necesita pausa.
const COUNT = 70
const LIFE = 0.9 // segundos que tarda cada rayita en cruzar
const SPREAD = 0.7 // segundos entre la primera y la última
const BLUE = 0.3 // fracción de rayitas azules

const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

export default function StripeSweep() {
  const canvas = useRef(null)

  useMotion(() => {
    const el = canvas.current
    const ctx = el.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = el.clientWidth
    const h = el.clientHeight
    el.width = Math.round(w * dpr)
    el.height = Math.round(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const colors = { blue: token('--color-accent'), gray: token('--color-text-muted') }
    const lines = Array.from({ length: COUNT }, (_, i) => ({
      x: (i / COUNT) * w + Math.random() * 6,
      len: h * (0.15 + Math.random() * 0.55),
      y: h * Math.random() * 0.2,
      delay: (i / COUNT) * SPREAD + Math.random() * 0.15,
      color: Math.random() < BLUE ? colors.blue : colors.gray,
    }))
    const start = performance.now()

    const tick = () => {
      const t = (performance.now() - start) / 1000
      ctx.clearRect(0, 0, w, h)
      ctx.lineWidth = 2
      let moving = false
      for (const line of lines) {
        const p = gsap.utils.clamp(0, 1, (t - line.delay) / LIFE)
        if (p < 1) moving = true
        if (p === 0 || p === 1) continue
        const eased = 1 - (1 - p) ** 3
        ctx.globalAlpha = p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4
        ctx.strokeStyle = line.color
        ctx.beginPath()
        const top = h - eased * (h + line.len) + line.y
        ctx.moveTo(line.x, top)
        ctx.lineTo(line.x, top + line.len)
        ctx.stroke()
      }
      if (!moving) {
        ctx.clearRect(0, 0, w, h)
        gsap.ticker.remove(tick)
      }
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  })

  return <canvas ref={canvas} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" />
}
