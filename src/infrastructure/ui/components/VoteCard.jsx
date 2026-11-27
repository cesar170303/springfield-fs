import { useState } from 'react'
import { formatScore, voteStats } from '../../../domain/vote'
import { positionLabel } from '../../../domain/squad'

/**
 * Tarjeta de un compañero (docs/SPEC.md §6): foto a sangre (sin foto, el dorsal), apodo, franja con sus datos del
 * partido y la barra de la nota, que empieza sin nota. «Aceptar nota» llama a `onAccept` con la nota o null.
 */
export default function VoteCard({ vote, matchLabel, opponent, onAccept, onSkip }) {
  const [score, setScore] = useState(null)
  const { player } = vote
  const text = score === null ? 'sin nota' : formatScore(score)

  return (
    <article aria-labelledby="vote-name" className="flex flex-col overflow-hidden rounded-3xl bg-surface">
      <div className="relative h-60 shrink-0 overflow-hidden bg-line">
        {player.photoUrl ? (
          <img src={player.photoUrl} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <span
            aria-hidden="true"
            className="absolute top-0 right-4 type-display text-[13rem] leading-none text-accent-text"
          >
            {player.shirtNumber}
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-b from-transparent to-surface" />
        <span className="absolute top-3 left-3 rounded-full bg-bg/60 px-2 py-1 type-label uppercase">
          {matchLabel} · {opponent}
        </span>
      </div>

      <div className="relative -mt-14 px-4">
        <h2 id="vote-name" className="type-display uppercase">
          {player.name}
        </h2>
        <p className="type-small text-text-muted">
          {positionLabel(player.position)}
          {player.shirtNumber !== null && ` · ${player.shirtNumber}`}
        </p>
      </div>

      <div className="mx-4 mt-3 flex border-y border-line">
        {voteStats(vote).map(({ value, unit }) => (
          <div key={unit} className="flex flex-1 flex-col border-l border-line py-2 pl-3 first:border-l-0 first:pl-0">
            <span className="type-number">{value}</span>
            <span className="type-label text-text-muted">{unit}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 px-4 pt-4 pb-3">
        <div className="flex items-baseline justify-between">
          <label htmlFor="vote-score" className="type-small font-semibold text-text-muted">
            Tu nota
          </label>
          {/* Lo que lee el lector de pantalla es aria-valuetext de la barra; esto es solo visual. */}
          <span aria-hidden="true" className="type-display text-accent-text tabular-nums">
            {formatScore(score)}
          </span>
        </div>
        <input
          id="vote-score"
          type="range"
          min="1"
          max="10"
          step="0.5"
          value={score ?? 5.5}
          aria-valuetext={text}
          onChange={(e) => setScore(Number(e.target.value))}
          className="w-full accent-accent"
        />
        <div aria-hidden="true" className="flex justify-between type-label text-text-muted">
          <span>1</span>
          <span>5,5</span>
          <span>10</span>
        </div>
        <button
          type="button"
          onClick={() => onAccept(score)}
          className="mt-2 min-h-12 rounded-md bg-accent px-4 type-body font-bold text-on-accent"
        >
          Aceptar nota
        </button>
        <button type="button" onClick={onSkip} className="min-h-11 self-center px-3 type-small underline">
          Saltar por ahora
        </button>
      </div>
    </article>
  )
}
