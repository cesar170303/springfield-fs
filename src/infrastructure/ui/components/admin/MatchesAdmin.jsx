import { Link, useLocation } from 'react-router'
import { matchState } from '../../../../domain/match'
import { formatShortDate } from '../../format'
import { matchStateText, scoreText } from '../../match-format'
import { useAsync } from '../../use-async'
import { useSeasonFilters } from '../../use-season-filters'
import { useUseCases } from '../../use-cases-context'
import SeasonFilters from '../SeasonFilters'
import AdminPage from './AdminPage'
import LoadError from './LoadError'
import { primaryButton } from './styles'

const pending = () => new Promise(() => {}) // hasta que la URL tenga temporada, no se pide nada
const calledText = (n) => `${n} ${n === 1 ? 'convocado' : 'convocados'}`

/** Partidos de la temporada (docs/SPEC.md §12): etiqueta, fecha, rival, estado y resultado. Cada uno abre su editor. */
export default function MatchesAdmin() {
  const season = useSeasonFilters()
  const { seasonId } = season
  const { listMatches } = useUseCases()
  const { data, error, reload } = useAsync(seasonId ? () => listMatches(seasonId) : pending, seasonId)
  const { search, state } = useLocation()

  return (
    <AdminPage
      title="Partidos"
      action={
        <Link to={{ pathname: '/admin/partidos/nuevo', search }} className={`flex items-center ${primaryButton}`}>
          Nuevo partido
        </Link>
      }
    >
      <SeasonFilters {...season} showCompetition={false} />
      {/* Lo que se acaba de hacer en un partido (borrarlo), que vuelve aquí al terminar. */}
      <p role="status" className="type-small text-text-muted empty:sr-only">
        {state?.ok}
      </p>
      {season.failed && <LoadError message="No se pudieron cargar las temporadas." onRetry={season.retry} />}
      {error && <LoadError message={error.message} onRetry={reload} />}
      {seasonId && !data && !error && <p className="text-text-muted">Cargando…</p>}
      {data?.matches.length === 0 && (
        <p className="text-text-muted">Aún no hay partidos en esta temporada. Crea el primero.</p>
      )}
      <ul className="grid md:grid-cols-2 md:gap-x-8">
        {data?.matches.map((match) => {
          const status = matchState(match)
          return (
            <li key={match.id}>
              <Link
                to={{ pathname: `/admin/partidos/${match.id}`, search }}
                className="flex min-h-20 items-center gap-3 border-t border-line py-2"
              >
                <span className="flex w-16 shrink-0 flex-col type-small text-text-muted">
                  <span>{match.label}</span> <span>{formatShortDate(match.date)}</span>
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate type-body font-semibold">{match.opponent}</span>{' '}
                  <span
                    className={`type-small ${status.key === 'unfinished' ? 'text-accent-text' : 'text-text-muted'}`}
                  >
                    {matchStateText(status)}
                  </span>
                </span>{' '}
                {status.key === 'upcoming' ? (
                  // Por jugar no hay resultado que enseñar: lo que toca es la convocatoria.
                  <span
                    className={`shrink-0 text-right type-small ${match.calledCount ? 'text-text-muted' : 'font-semibold text-accent-text'}`}
                  >
                    {match.calledCount ? calledText(match.calledCount) : 'Hacer convocatoria'}
                  </span>
                ) : (
                  <span className="type-name whitespace-nowrap tabular-nums">{scoreText(match)}</span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </AdminPage>
  )
}
