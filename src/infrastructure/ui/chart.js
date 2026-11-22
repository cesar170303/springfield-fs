// Geometría de la gráfica de la ficha (docs/SPEC.md §7): dónde va cada punto, cada línea y cada marca, en píxeles.
// Sin librería de gráficas (decidido el 2026-11-22): SVG a mano.
import { ratingRange } from '../../domain/player'

const PAD = { top: 12, right: 12, bottom: 28, left: 28 }
const MIN_LABEL_GAP = 44 // px entre etiquetas del eje: «Copa J1» cabe

const round = (v) => Math.round(v * 100) / 100

/** Curva suave que pasa por todos los puntos (Catmull-Rom convertida en curvas de Bézier). */
export function smoothPath(points) {
  const n = points.length
  if (n < 2) return ''
  const at = (i) => points[Math.max(0, Math.min(n - 1, i))]
  const k = 0.18
  let d = `M${round(points[0][0])},${round(points[0][1])}`
  for (let i = 0; i < n - 1; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)]
    d +=
      `C${round(p1[0] + (p2[0] - p0[0]) * k)},${round(p1[1] + (p2[1] - p0[1]) * k)}` +
      ` ${round(p2[0] - (p3[0] - p1[0]) * k)},${round(p2[1] - (p3[1] - p1[1]) * k)}` +
      ` ${round(p2[0])},${round(p2[1])}`
  }
  return d
}

/**
 * Todo lo que dibuja la gráfica para un ancho y un alto: puntos de la nota (con su etiqueta, si cabe), las tres
 * líneas, el área bajo la nota, las marcas del eje y `nearest(x)`, el partido más cercano a una posición.
 * @param {import('../../application/ports/player').RatingPoint[]} timeline
 */
export function ratingChart(timeline, { width, height }) {
  const { min, max } = ratingRange(timeline)
  const [left, right, top, bottom] = [PAD.left, width - PAD.right, PAD.top, height - PAD.bottom]
  const n = timeline.length
  const step = n > 1 ? (right - left) / (n - 1) : 0
  const x = (i) => (n > 1 ? left + i * step : (left + right) / 2)
  const y = (v) => top + ((max - v) / (max - min)) * (bottom - top)
  // Con muchos partidos, una etiqueta cada `every`, contando desde el último (el más reciente siempre la lleva).
  const every = n > 1 ? Math.max(1, Math.ceil(MIN_LABEL_GAP / step)) : 1
  const points = timeline.map((p, i) => ({
    ...p,
    x: round(x(i)),
    y: round(y(p.rating)),
    showLabel: (n - 1 - i) % every === 0,
  }))
  const line = (key) => smoothPath(timeline.map((p, i) => [x(i), y(p[key])]))
  const rating = line('rating')
  const ticks = []
  for (let v = min; v <= max; v++) ticks.push({ value: v, y: round(y(v)) })

  return {
    plot: { left, right, top, bottom },
    ticks,
    points,
    paths: {
      rating,
      cumulative: line('cumulativeAvg'),
      team: line('teamAvg'),
      area: rating && `${rating}L${points[n - 1].x},${bottom}L${points[0].x},${bottom}Z`,
    },
    nearest: (px) => (n > 1 ? Math.max(0, Math.min(n - 1, Math.round((px - left) / step))) : 0),
  }
}
