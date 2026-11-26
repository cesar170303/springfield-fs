import { finishBlockers, missingGoals, votingAfterFinish } from '../../../../domain/match'
import { formatDateTime, missingGoalsText } from '../../match-format'
import { useAsync } from '../../use-async'
import { useUseCases } from '../../use-cases-context'
import ConfirmButton from './ConfirmButton'
import LoadError from './LoadError'
import { primaryButton, secondaryButton } from './styles'

/**
 * Terminar el partido (abre la votación) o reabrirlo (docs/SPEC.md §12). Explica lo que falta para poder terminarlo,
 * avisa de los goles sin goleador (sin bloquear: el marcador manda) y de hasta cuándo se podrá votar. Lo que impida la
 * base de datos (reabrir con votos, terminar con fecha futura) se explica con su frase. `onDone(mensaje)` al acabar.
 */
export default function FinishMatch({ match, seasonId, onDone }) {
  const { getMatchGoals, finishMatch, reopenMatch } = useUseCases()
  const { data, error, reload } = useAsync(
    () => getMatchGoals({ matchId: match.id, seasonId }),
    `${match.id}-${seasonId}`,
  )

  if (match.isFinished) {
    return (
      <section aria-labelledby="terminado" className="flex flex-col gap-3 rounded-lg bg-surface p-4">
        <h2 id="terminado" className="type-title">
          Partido terminado
        </h2>
        <ConfirmButton
          label="Reabrir partido"
          question="¿Reabrir el partido? Se cierra la votación y sus cifras salen de la plantilla. Solo se puede si nadie ha votado."
          confirmLabel="Sí, reabrir"
          onConfirm={async () => {
            await reopenMatch(match.id)
            onDone('Partido reabierto.')
          }}
          className={secondaryButton}
        />
      </section>
    )
  }

  const blockers = data ? finishBlockers({ ...match, playersWithMinutes: data.players.length }) : []
  const voting = votingAfterFinish(match.date)
  const votingText = voting.open
    ? `La votación estará abierta hasta el ${formatDateTime(voting.closesAt)}.`
    : 'Ya no habrá votación: pasaron más de 7 días desde el partido.'
  const missing = data ? missingGoals(match.goalsFor, data.goals.length) : 0

  return (
    <section aria-labelledby="terminar" className="flex flex-col gap-3 rounded-lg bg-surface p-4">
      <h2 id="terminar" className="type-title">
        Terminar partido
      </h2>
      {error && <LoadError message={error.message} onRetry={reload} />}
      {!data && !error && <p className="text-text-muted">Cargando…</p>}
      {data && blockers.length > 0 && (
        <>
          <p className="type-small text-text-muted">Para terminarlo falta:</p>
          <ul className="flex list-disc flex-col gap-1 pl-5 type-small">
            {blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </>
      )}
      {data && blockers.length === 0 && (
        <>
          {missing > 0 && <p className="type-small text-accent-text">{missingGoalsText(missing)}</p>}
          <p className="type-small text-text-muted">{votingText}</p>
          <ConfirmButton
            label={voting.open ? 'Terminar y abrir la votación' : 'Terminar partido'}
            question="¿Terminar el partido? Sus cifras entran en la plantilla."
            confirmLabel="Sí, terminar"
            onConfirm={async () => {
              await finishMatch(match.id)
              onDone(
                voting.open
                  ? `Partido terminado. La votación está abierta hasta el ${formatDateTime(voting.closesAt)}.`
                  : 'Partido terminado.',
              )
            }}
            className={primaryButton}
          />
        </>
      )}
    </section>
  )
}
