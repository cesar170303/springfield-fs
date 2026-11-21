import { useLayoutEffect, useRef, useState } from 'react'
import { gsap, useMotion } from '../motion'

// Campo de rayas del login (docs/SPEC.md §11), al estilo de la referencia DeepBook: rayitas verticales que suben por
// curvas paralelas, con destellos azules sueltos. Se dibuja en un espacio de referencia de 1440×840.
const REF_W = 1440
const REF_H = 840
// El dibujo se escala como si cubriera toda la pantalla (como la cabecera de DeepBook), aunque el hueco sea solo el
// 55 % de arriba del login: así las rayitas salen del mismo tamaño que en la referencia.
const SHOWN = 0.55
const STEP = 45 // px entre rayitas a lo largo de cada curva
const SPEED = 0.7 // rayitas que avanza cada curva por segundo
const DASH = 30 // alto de cada rayita
const FADE = 0.2 // fundido a negro arriba y abajo, en fracción del alto
const BLUE_LIFE = 1.2 // segundos que dura cada destello (±30 %)

const key = (chain, dash) => chain * 1000 + dash
const CHAINS = buildChains()
// Desfase de las rayitas de cada curva (proporción áurea): sin él, las de curvas vecinas caen a la misma altura y
// el dibujo parece una rejilla en vez de curvas.
const SHIFT = CHAINS.map((_, c) => (c * 0.618) % 1)
// Quieto no hay destellos que vayan y vengan: una de cada 50 rayitas visibles se queda en azul.
const staticBlue = (_, visibleCount) => visibleCount % 50 === 20

/**
 * Curvas: parábolas tumbadas (x = x0 + (y − yV)² / 580) cada 95 px. El vértice (yV) sube hacia la derecha: a la
 * izquierda se ven arcos «(» y a la derecha, diagonales. Cada curva se recorre de abajo arriba, partida en puntos
 * separados STEP px (un punto, una rayita), y empieza y acaba fuera de lo que se ve: así no se nota cuando una
 * rayita llega al final y vuelve a empezar.
 */
function buildChains() {
  const chains = []
  for (let x0 = -1000; x0 <= 1500; x0 += 95) {
    const yV = REF_H / 2 + 0.31 * (REF_W / 2 - x0)
    const curve = (y) => [x0 + (y - yV) ** 2 / 580, y]
    let prev = curve(REF_H - 20)
    const points = [prev]
    let run = 0
    for (let y = REF_H - 21; y >= 20; y--) {
      const p = curve(y)
      run += Math.hypot(p[0] - prev[0], p[1] - prev[1])
      prev = p
      if (run >= STEP) {
        points.push(p)
        run = 0
      }
    }
    chains.push(points)
  }
  return chains
}

function measure(canvas, ctx) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2) // más de 2× no se nota en rayas tan finas y cuesta el doble
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  canvas.width = Math.round(w * dpr)
  canvas.height = Math.round(h * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const frameH = h / SHOWN
  const scale = Math.max(w / REF_W, frameH / REF_H)
  return {
    w,
    h,
    scale,
    offX: (w - REF_W * scale) / 2,
    offY: (h - REF_H * scale) / 2, // el centro del dibujo, en el centro del hueco
    dash: DASH * scale,
    // Grosor como en la referencia: 2,5 px en un móvil de 375 px y 3,75 px a 1440.
    lineWidth: gsap.utils.clamp(2.5, 3.75, gsap.utils.mapRange(375, 1440, 2.5, 3.75, w)),
  }
}

function strokeDashes(ctx, points, color, dash) {
  ctx.strokeStyle = color
  ctx.beginPath()
  for (let p = 0; p < points.length; p += 2) {
    ctx.moveTo(points[p], points[p + 1] - dash / 2)
    ctx.lineTo(points[p], points[p + 1] + dash / 2)
  }
  ctx.stroke()
}

/** Dibuja un fotograma y devuelve las rayitas que han quedado a la vista (de ahí salen los destellos). */
function paint(ctx, size, colors, phase, isBlue) {
  const { w, h, scale, offX, offY, dash } = size
  const visible = []
  ctx.clearRect(0, 0, w, h)
  if (!w || !h) return visible
  const gray = []
  const blue = []
  CHAINS.forEach((chain, c) => {
    const n = chain.length
    for (let i = 0; i < n; i++) {
      const at = (phase + i + SHIFT[c]) % n // cada rayita avanza por su curva; al llegar arriba, vuelve abajo
      const k = Math.floor(at)
      if (k === n - 1) continue // el tramo de vuelta, fuera del dibujo
      const t = at - k
      const [x1, y1] = chain[k]
      const [x2, y2] = chain[k + 1]
      const x = (x1 + (x2 - x1) * t) * scale + offX
      const y = (y1 + (y2 - y1) * t) * scale + offY
      if (x < -dash || x > w + dash || y < -dash || y > h + dash) continue
      visible.push(key(c, i))
      ;(isBlue(key(c, i), visible.length) ? blue : gray).push(x, y)
    }
  })
  ctx.lineWidth = size.lineWidth
  strokeDashes(ctx, gray, colors.dash, dash)
  strokeDashes(ctx, blue, colors.blue, dash)
  // Fundido arriba y abajo: se borra con un degradado. En este modo solo cuenta el alfa, no el color.
  ctx.globalCompositeOperation = 'destination-out'
  const fade = h * FADE
  for (const [from, to] of [
    [0, fade],
    [h, h - fade],
  ]) {
    const gradient = ctx.createLinearGradient(0, from, 0, to)
    gradient.addColorStop(0, 'rgba(0, 0, 0, 1)')
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, Math.min(from, to), w, fade)
  }
  ctx.globalCompositeOperation = 'source-over'
  return visible
}

// Destellos: rayitas a la vista que se pintan de azul un rato y dejan su sitio a otras. Uno por cada 50 visibles,
// entre 2 y 6 a la vez (los 6 de la referencia en escritorio).
function refreshBlues(blues, now, visible) {
  for (const [k, until] of blues) if (until <= now) blues.delete(k)
  const target = gsap.utils.clamp(2, 6, Math.round(visible.length / 50))
  for (let tries = 0; blues.size < target && visible.length && tries < 30; tries++) {
    const k = visible[Math.floor(Math.random() * visible.length)]
    if (!blues.has(k)) blues.set(k, now + BLUE_LIFE * (0.7 + Math.random() * 0.6))
  }
}

/**
 * Fondo animado del login. Va dentro de un contenedor `relative isolate`: el canvas lo cubre entero, por detrás.
 * Mientras se mueve, ofrece un botón para pararlo (WCAG 2.2.2); con «reducir movimiento», se dibuja quieto.
 */
export default function StripeField() {
  const canvasRef = useRef(null)
  const field = useRef(null)
  const paused = useRef(false)
  const [moving, setMoving] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  // Va antes que useMotion: los dos son efectos de layout y este prepara el dibujo que aquel anima.
  useLayoutEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // Colores de los tokens: las clases del canvas fijan `color` (rayitas) y `stroke` (destellos).
    const { color, stroke } = getComputedStyle(canvas)
    let size = measure(canvas, ctx)
    let last = [0, staticBlue]
    const draw = (phase, isBlue) => {
      last = [phase, isBlue]
      return paint(ctx, size, { dash: color, blue: stroke }, phase, isBlue)
    }
    field.current = { draw }
    draw(0, staticBlue)
    const onResize = () => {
      size = measure(canvas, ctx)
      draw(...last)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useMotion(() => {
    const { draw } = field.current ?? {}
    if (!draw) return // sin canvas 2D no hay nada que animar
    const blues = new Map()
    const isBlue = (k) => blues.has(k)
    let visible = []
    let phase = 0
    const tick = (time, deltaTime) => {
      if (paused.current) return
      phase += SPEED * Math.min(deltaTime / 1000, 0.05) // tras volver de otra pestaña, sin saltos
      refreshBlues(blues, time, visible)
      visible = draw(phase, isBlue)
    }
    gsap.ticker.add(tick)
    setMoving(true)
    return () => {
      gsap.ticker.remove(tick)
      setMoving(false)
      draw(0, staticBlue) // si se activa «reducir movimiento» a mitad, queda el dibujo quieto
    }
  })

  function togglePause() {
    paused.current = !paused.current
    setIsPaused(paused.current)
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 -z-10 size-full stroke-accent text-border"
      />
      {moving && (
        <button
          type="button"
          onClick={togglePause}
          aria-label={isPaused ? 'Reanudar la animación' : 'Pausar la animación'}
          className="absolute top-4 right-4 grid size-11 place-items-center rounded-full border border-border bg-bg"
        >
          <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 fill-current">
            <path d={isPaused ? 'M4 2v12l10-6z' : 'M3 2h4v12H3zm6 0h4v12H9z'} />
          </svg>
        </button>
      )}
    </>
  )
}
