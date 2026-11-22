import { useId, useState } from 'react'
import { isVotingOpen, matchSummary } from '../../../domain/player'
import { formatShortDate, formatStat } from '../format'

const SHOWN = 4

/** Últimos partidos del jugador: rival, resumen y la nota o, si la votación sigue abierta, hasta cuándo. */
export default function MatchLog({ matches }) {
  const id = useId()
  const [all, setAll] = useState(false)
  const shown = all ? matches : matches.slice(0, SHOWN)

  return (
    <section data-reveal aria-labelledby={id}>
      <h2 id={id} className="type-display text-[2rem] leading-none md:text-[2.5rem]">
        Últimos partidos
      </h2>
      {matches.length === 0 ? (
        <p className="mt-2 type-small text-text-muted">Todavía no ha jugado ningún partido.</p>
      ) : (
        <ol className="mt-3">
          {shown.map((m) => (
            <li key={m.matchId} className="flex items-center gap-3 border-t border-line py-3 last:border-b">
              <span className="w-14 shrink-0 type-small text-text-muted">{m.label}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">vs. {m.opponent}</span>
                <span className="block type-label text-text-muted">{matchSummary(m)}</span>
              </span>
              <Result match={m} />
            </li>
          ))}
        </ol>
      )}
      {!all && matches.length > SHOWN && (
        <button
          type="button"
          onClick={() => setAll(true)}
          className="mt-3 min-h-11 w-full rounded-full border border-border type-small"
        >
          Ver todos los partidos
        </button>
      )}
    </section>
  )
}

function Result({ match }) {
  if (match.rating !== null) {
    return (
      <span className={`type-number text-[1.75rem] leading-none ${match.isMvp ? 'text-accent-text' : ''}`}>
        {formatStat(match.rating, 1)}
      </span>
    )
  }
  if (isVotingOpen(match)) {
    return (
      <span className="text-right type-label text-text-muted">
        {'Votación abierta '}
        <br />
        hasta el {formatShortDate(match.votingClosesAt)}
      </span>
    )
  }
  return <span className="type-label text-text-muted">Sin nota</span>
}
