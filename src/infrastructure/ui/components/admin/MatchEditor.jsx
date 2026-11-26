import { useLocation, useNavigate, useParams } from 'react-router'
import { matchState } from '../../../../domain/match'
import { formatDateTime, matchStateText, scoreText } from '../../match-format'
import { useAsync } from '../../use-async'
import { useSeasonFilters } from '../../use-season-filters'
import { useUseCases } from '../../use-cases-context'
import AdminPage from './AdminPage'
import ConfirmButton from './ConfirmButton'
import FinishMatch from './FinishMatch'
import GoalsEditor from './GoalsEditor'
import LoadError from './LoadError'
import MatchForm from './MatchForm'
import SquadEditor from './SquadEditor'
import { dangerButton } from './styles'

const MATCHES = { to: '/admin/partidos', label: 'Partidos', name: 'Volver a partidos' }
const pending = () => new Promise(() => {}) // hasta que la URL tenga temporada, no se pide nada

/**
 * Editor de un partido (docs/SPEC.md §12): cabecera, «Datos del partido», convocatoria, goles y penaltis fallados,
 * terminar o reabrir, y borrar (solo sin terminar).
 */
export default function MatchEditor() {
  const { matchId } = useParams()
  const { seasonId } = useSeasonFilters()
  const { listMatches, saveMatch, deleteMatch } = useUseCases()
  const { data, error, reload } = useAsync(seasonId ? () => listMatches(seasonId) : pending, seasonId)
  const { search, state } = useLocation()
  const navigate = useNavigate()
  const ok = state?.ok ?? '' // lo que llega de la pantalla anterior (partido recién creado)
  const match = data?.matches.find((m) => String(m.id) === matchId)
  const backToList = (message) => navigate({ pathname: MATCHES.to, search }, { state: { ok: message } })

  if (!match) {
    return (
      <AdminPage title="Partido" back={MATCHES}>
        {error && <LoadError message={error.message} onRetry={reload} />}
        {!data && !error && <p className="text-text-muted">Cargando…</p>}
        {data && <p className="text-text-muted">Este partido no existe en esta temporada.</p>}
      </AdminPage>
    )
  }

  return (
    <AdminPage
      title={match.opponent}
      back={MATCHES}
      action={match.goalsFor !== null && <span className="type-number">{scoreText(match)}</span>}
    >
      <p className="-mt-4 type-small text-text-muted">
        {match.label}, {formatDateTime(match.date)} · {matchStateText(matchState(match))}
      </p>
      <p role="status" className="type-small text-text-muted empty:sr-only">
        {ok}
      </p>
      <section aria-labelledby="datos-partido" className="flex flex-col gap-3">
        <h2 id="datos-partido" className="type-title">
          Datos del partido
        </h2>
        <MatchForm
          match={match}
          competitions={data.competitions}
          onSave={async (values) => {
            await saveMatch({ ...values, id: match.id, seasonId })
            backToList('Datos guardados.')
          }}
          onCancel={() => backToList()}
        />
      </section>
      <SquadEditor matchId={match.id} seasonId={seasonId} onSaved={() => backToList('Convocatoria guardada.')} />
      <GoalsEditor matchId={match.id} seasonId={seasonId} goalsFor={match.goalsFor} />
      <FinishMatch match={match} seasonId={seasonId} onDone={backToList} />
      {/* Terminado no se borra (se reabre antes); con votos, la base de datos tampoco lo deja. */}
      {!match.isFinished && (
        <ConfirmButton
          label="Borrar partido"
          question={`¿Borrar el partido ${match.label} contra ${match.opponent}? Se borran también su convocatoria y sus goles.`}
          confirmLabel="Sí, borrar"
          onConfirm={async () => {
            await deleteMatch(match.id)
            backToList('Partido borrado.')
          }}
          className={dangerButton}
        />
      )}
    </AdminPage>
  )
}
