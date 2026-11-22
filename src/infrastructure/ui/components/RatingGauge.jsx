import { useId } from 'react'
import { ratingFraction } from '../../../domain/player'
import { formatStat } from '../format'

const ARC = 'M 20 140 A 120 120 0 0 1 260 140'
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

/** Medidor de media luna con la valoración media de 1 a 10: solo cuenta votaciones cerradas (docs/SPEC.md §6). */
export default function RatingGauge({ avg, ratedMatches }) {
  const id = useId().replace(/[^\w-]/g, '')
  const value = formatStat(avg, 1)
  const fill = ratingFraction(avg) * 100

  return (
    <section
      data-reveal
      aria-labelledby={`${id}-title`}
      className="flex flex-col items-center rounded-lg bg-surface px-4 pt-5 pb-4"
    >
      <h2 id={`${id}-title`} className="self-start type-label font-semibold text-text-muted uppercase">
        Valoración media
      </h2>
      <div className="relative mt-2 w-full max-w-70">
        <svg
          viewBox="0 0 280 156"
          className="block w-full"
          role="img"
          aria-label={avg === null ? 'Sin valoración media todavía' : `Valoración media ${value} sobre 10`}
        >
          <defs>
            <linearGradient id={`${id}-fill`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" style={{ stopColor: 'var(--color-accent)' }} />
              <stop offset="1" style={{ stopColor: 'var(--color-accent-text)' }} />
            </linearGradient>
          </defs>
          <path d={ARC} fill="none" className="stroke-line" strokeWidth="18" strokeLinecap="round" />
          {fill > 0 && (
            <path
              data-gauge={fill}
              d={ARC}
              fill="none"
              stroke={`url(#${id}-fill)`}
              strokeWidth="18"
              strokeLinecap="round"
              pathLength="100"
              strokeDasharray={`${fill} 100`}
            />
          )}
        </svg>
        {/* El número ya lo lee el nombre de la imagen: aquí es solo visual. */}
        <span
          aria-hidden="true"
          data-count={avg ?? undefined}
          data-decimals="1"
          className="absolute inset-x-0 bottom-1 text-center type-number text-7xl leading-none"
        >
          {value}
        </span>
      </div>
      <div aria-hidden="true" className="flex w-full max-w-70 justify-between type-label text-text-muted">
        <span>1</span>
        <span>10</span>
      </div>
      <p className="mt-3 type-small text-text-muted">
        {ratedMatches ? plural(ratedMatches, 'partido valorado', 'partidos valorados') : 'Aún sin partidos valorados'}
      </p>
    </section>
  )
}
