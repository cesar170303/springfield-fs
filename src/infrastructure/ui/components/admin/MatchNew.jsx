import { useLocation, useNavigate } from 'react-router'
import { nextRound } from '../../../../domain/match'
import { useAsync } from '../../use-async'
import { useSeasonFilters } from '../../use-season-filters'
import { useUseCases } from '../../use-cases-context'
import AdminPage from './AdminPage'
import { toLocalTime } from '../../match-format'
import LoadError from './LoadError'
import MatchForm from './MatchForm'

const MATCHES = { to: '/admin/partidos', label: 'Partidos', name: 'Volver a partidos' }
const pending = () => new Promise(() => {}) // hasta que la URL tenga temporada, no se pide nada

/** Alta de un partido en la temporada elegida (docs/SPEC.md §12). Al guardarlo, abre su editor. */
export default function MatchNew() {
  const { seasonId } = useSeasonFilters()
  const { listMatches, saveMatch } = useUseCases()
  const { data, error, reload } = useAsync(seasonId ? () => listMatches(seasonId) : pending, seasonId)
  const { search } = useLocation()
  const navigate = useNavigate()
  const first = data?.competitions[0]
  // Se propone la hora del último partido: los partidos suelen ser a la misma hora.
  const last = data?.matches.reduce((a, b) => (!a || b.date > a.date ? b : a), null)

  return (
    <AdminPage title="Nuevo partido" back={MATCHES}>
      {error && <LoadError message={error.message} onRetry={reload} />}
      {seasonId && !data && !error && <p className="text-text-muted">Cargando…</p>}
      {data && !first && (
        <p className="text-text-muted">Primero, crea una competición en «Temporadas y competiciones».</p>
      )}
      {first && (
        <MatchForm
          match={{ competitionId: first.id, round: nextRound(data.matches, first.id), opponent: '', date: null }}
          competitions={data.competitions}
          matches={data.matches}
          defaultTime={last?.date ? toLocalTime(last.date) : undefined}
          onSave={async (values) => {
            const id = await saveMatch({ ...values, seasonId })
            navigate({ pathname: `/admin/partidos/${id}`, search }, { state: { ok: 'Partido creado.' } })
          }}
          onCancel={() => navigate({ pathname: MATCHES.to, search })}
        />
      )}
    </AdminPage>
  )
}
