import { useId, useState } from 'react'
import { ratingChart } from '../chart'
import { formatStat } from '../format'
import { useWidth } from '../use-width'

const HEIGHT = 220
const NAME = 'Gráfica de la valoración: nota de cada partido, su media acumulada y la media del equipo'

/**
 * Gráfica de la ficha (docs/SPEC.md §7): nota de cada partido, media acumulada y media del equipo. Al pasar el ratón
 * o el dedo, los datos del partido; para quien no pueda verla, la misma información en una tabla.
 * @param {{ timeline: import('../../../application/ports/player').RatingPoint[], competitionFiltered?: boolean }} props
 */
export default function RatingChart({ timeline, competitionFiltered = false }) {
  const id = useId().replace(/[^\w-]/g, '')
  const [measure, width] = useWidth(328)
  const [hover, setHover] = useState(null)
  const [asTable, setAsTable] = useState(false)
  const chart = ratingChart(timeline, { width, height: HEIGHT })
  const hovered = hover === null ? null : chart.points[hover]

  function pointAt(event) {
    const x = event.clientX - event.currentTarget.getBoundingClientRect().left
    if (Number.isFinite(x)) setHover(chart.nearest(x))
  }

  return (
    <section data-reveal data-chart aria-labelledby={`${id}-title`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={`${id}-title`} className="type-display text-[2rem] leading-none md:text-[2.5rem]">
          Partido a partido
        </h2>
        {timeline.length > 0 && (
          <button type="button" onClick={() => setAsTable(!asTable)} className="min-h-11 type-small text-accent-text">
            {asTable ? 'Ver como gráfica' : 'Ver como tabla'}
          </button>
        )}
      </div>

      {timeline.length === 0 ? (
        <p className="mt-2 type-small text-text-muted">Todavía no hay partidos con la votación cerrada.</p>
      ) : (
        <>
          <Legend />
          {competitionFiltered && (
            <p className="-mt-1 mb-3 type-label text-text-muted">Incluye todas las competiciones.</p>
          )}
          <div ref={measure}>
            {asTable ? (
              <RatingTable timeline={timeline} />
            ) : (
              <div
                data-testid="chart-area"
                className="relative cursor-crosshair touch-pan-y"
                onPointerMove={pointAt}
                onPointerDown={pointAt}
                onPointerLeave={() => setHover(null)}
              >
                <svg width={width} height={HEIGHT} role="img" aria-label={NAME} className="block overflow-visible">
                  <defs>
                    <linearGradient
                      id={`${id}-line`}
                      gradientUnits="userSpaceOnUse"
                      x1={chart.plot.left}
                      x2={chart.plot.right}
                      y1="0"
                      y2="0"
                    >
                      <stop offset="0" style={{ stopColor: 'var(--color-accent)' }} />
                      <stop offset="1" style={{ stopColor: 'var(--color-accent-text)' }} />
                    </linearGradient>
                    <linearGradient
                      id={`${id}-area`}
                      gradientUnits="userSpaceOnUse"
                      x1="0"
                      x2="0"
                      y1={chart.plot.top}
                      y2={chart.plot.bottom}
                    >
                      <stop offset="0" style={{ stopColor: 'var(--color-accent)', stopOpacity: 0.3 }} />
                      <stop offset="1" style={{ stopColor: 'var(--color-accent)', stopOpacity: 0 }} />
                    </linearGradient>
                    {/* El área se difumina hacia la izquierda: lo reciente pesa más. */}
                    <linearGradient id={`${id}-fade`} gradientUnits="userSpaceOnUse" x1="0" x2={width} y1="0" y2="0">
                      <stop offset="0" style={{ stopColor: 'var(--color-text)', stopOpacity: 0.2 }} />
                      <stop offset="1" style={{ stopColor: 'var(--color-text)', stopOpacity: 1 }} />
                    </linearGradient>
                    <mask id={`${id}-mask`}>
                      <rect width={width} height={HEIGHT} fill={`url(#${id}-fade)`} />
                    </mask>
                  </defs>

                  {chart.ticks.map((t) => (
                    <g key={t.value}>
                      <line x1={chart.plot.left} x2={chart.plot.right} y1={t.y} y2={t.y} className="stroke-line" />
                      <text
                        x={chart.plot.left - 10}
                        y={t.y}
                        dy="0.32em"
                        textAnchor="end"
                        className="fill-text-muted text-[10px]"
                      >
                        {t.value}
                      </text>
                    </g>
                  ))}

                  {chart.paths.area && (
                    <path data-fade d={chart.paths.area} fill={`url(#${id}-area)`} mask={`url(#${id}-mask)`} />
                  )}
                  <path
                    data-fade
                    d={chart.paths.team}
                    fill="none"
                    className="stroke-text-muted"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                  />
                  <path
                    data-draw
                    pathLength="1"
                    d={chart.paths.cumulative}
                    fill="none"
                    className="stroke-text"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    data-draw
                    pathLength="1"
                    d={chart.paths.rating}
                    fill="none"
                    stroke={`url(#${id}-line)`}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {chart.points.map((p) => (
                    <circle
                      data-dot
                      key={p.matchId}
                      cx={p.x}
                      cy={p.y}
                      r="4.5"
                      className="fill-accent stroke-bg"
                      strokeWidth="2"
                    />
                  ))}

                  {hovered && (
                    <g>
                      <line
                        x1={hovered.x}
                        x2={hovered.x}
                        y1={chart.plot.top - 6}
                        y2={chart.plot.bottom}
                        className="stroke-text-muted/60"
                      />
                      <circle
                        cx={hovered.x}
                        cy={hovered.y}
                        r="7"
                        className="fill-accent-text stroke-bg"
                        strokeWidth="2"
                      />
                    </g>
                  )}

                  {chart.points.map(
                    (p) =>
                      p.showLabel && (
                        <text
                          key={p.matchId}
                          x={p.x}
                          y={HEIGHT - 8}
                          textAnchor="middle"
                          className="fill-text-muted text-[10px]"
                        >
                          {p.label}
                        </text>
                      ),
                  )}
                </svg>
                {hovered && <Tooltip point={hovered} width={width} />}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}

function Legend() {
  return (
    <ul className="mt-2 mb-3 flex flex-wrap gap-x-4 gap-y-1.5 type-label text-text-muted">
      <li className="flex items-center gap-1.5">
        <svg aria-hidden="true" width="20" height="8">
          <line x1="0" y1="4" x2="20" y2="4" className="stroke-accent" strokeWidth="3" />
          <circle cx="10" cy="4" r="3" className="fill-accent" />
        </svg>
        Nota del partido
      </li>
      <li className="flex items-center gap-1.5">
        <svg aria-hidden="true" width="20" height="8">
          <line x1="0" y1="4" x2="20" y2="4" className="stroke-text" strokeWidth="2" />
        </svg>
        Su media
      </li>
      <li className="flex items-center gap-1.5">
        <svg aria-hidden="true" width="20" height="8">
          <line x1="0" y1="4" x2="20" y2="4" className="stroke-text-muted" strokeWidth="2" strokeDasharray="4 3" />
        </svg>
        Media del equipo
      </li>
    </ul>
  )
}

function Tooltip({ point, width }) {
  // Cerca de los bordes, la caja se aparta hacia dentro para no salirse.
  const shift = point.x < 80 ? '-15%' : point.x > width - 80 ? '-85%' : '-50%'
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 rounded-xl border border-line bg-surface/95 px-2.5 py-2 type-label whitespace-nowrap shadow-lg backdrop-blur-md"
      style={{ left: point.x, top: point.y, transform: `translate(${shift}, calc(-100% - 14px))` }}
    >
      <p className="mb-1 text-text-muted">
        {point.label} · vs. {point.opponent}
      </p>
      <TipRow swatch="bg-accent" label="Nota" value={point.rating} />
      <TipRow swatch="bg-text" label="Su media" value={point.cumulativeAvg} />
      <TipRow swatch="bg-text-muted" label="Equipo" value={point.teamAvg} />
    </div>
  )
}

function TipRow({ swatch, label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5 text-text-muted">
        <span aria-hidden="true" className={`size-2 rounded-xs ${swatch}`} />
        {label}
      </span>
      <b className="type-name text-base">{formatStat(value, 1)}</b>
    </div>
  )
}

function RatingTable({ timeline }) {
  const num = 'px-1 text-right tabular-nums'
  return (
    <table className="w-full type-small">
      <caption className="sr-only">Valoración partido a partido</caption>
      <thead className="type-label text-text-muted">
        <tr>
          <th className="py-2 text-left font-medium">Partido</th>
          <th className="text-left font-medium">Rival</th>
          <th className={`${num} font-medium`}>Nota</th>
          <th className={`${num} font-medium`}>Su media</th>
          <th className={`${num} font-medium`}>Equipo</th>
        </tr>
      </thead>
      <tbody>
        {timeline.map((p) => (
          <tr key={p.matchId} className="border-t border-line">
            <th scope="row" className="py-2 text-left font-normal">
              {p.label}
            </th>
            <td>{p.opponent}</td>
            <td className={num}>{formatStat(p.rating, 1)}</td>
            <td className={num}>{formatStat(p.cumulativeAvg, 1)}</td>
            <td className={num}>{formatStat(p.teamAvg, 1)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
