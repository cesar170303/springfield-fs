import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { statusLabel } from '../../../../domain/player'
import { playerName, positionLabel } from '../../../../domain/squad'
import { useAsync } from '../../use-async'
import { useUseCases } from '../../use-cases-context'
import PlayerAvatar from '../PlayerAvatar'
import AdminPage from './AdminPage'
import LoadError from './LoadError'
import { primaryButton } from './styles'

const tab = (pressed) =>
  `min-h-11 rounded-full border px-4 type-small ${pressed ? 'border-accent bg-accent text-on-accent' : 'border-border'}`

/** Fichas de jugadores (docs/SPEC.md §12): activas y, aparte, archivadas. Cada una abre su edición. */
export default function PlayersAdmin() {
  const { listPlayers } = useUseCases()
  const { data: players, error, reload } = useAsync(listPlayers)
  const [showArchived, setShowArchived] = useState(false)
  const { search, state } = useLocation()
  const shown = players?.filter((p) => p.archived === showArchived)
  const count = (archived) => players?.filter((p) => p.archived === archived).length ?? 0

  return (
    <AdminPage
      title="Jugadores"
      action={
        <Link to={{ pathname: '/admin/jugadores/nuevo', search }} className={`flex items-center ${primaryButton}`}>
          Nueva ficha
        </Link>
      }
    >
      {/* Lo que se acaba de hacer en una ficha (guardar, archivar…), que vuelve aquí al terminar. */}
      <p role="status" className="type-small text-text-muted empty:sr-only">
        {state?.ok}
      </p>
      {error && <LoadError message={error.message} onRetry={reload} />}
      {!players && !error && <p className="text-text-muted">Cargando…</p>}
      {players && (
        <>
          <div className="flex gap-2">
            <button
              type="button"
              aria-pressed={!showArchived}
              onClick={() => setShowArchived(false)}
              className={tab(!showArchived)}
            >
              Activos, {count(false)}
            </button>
            <button
              type="button"
              aria-pressed={showArchived}
              onClick={() => setShowArchived(true)}
              className={tab(showArchived)}
            >
              Archivados, {count(true)}
            </button>
          </div>
          {shown.length === 0 && (
            <p className="text-text-muted">
              {showArchived ? 'No hay fichas archivadas.' : 'Aún no hay ninguna ficha. Crea la primera.'}
            </p>
          )}
          <ul className="grid md:grid-cols-2 md:gap-x-8">
            {shown.map((player) => (
              <li key={player.id}>
                <Link
                  to={{ pathname: `/admin/jugadores/${player.id}`, search }}
                  className="flex min-h-18 items-center gap-3 border-t border-line py-2"
                >
                  <PlayerAvatar name={playerName(player)} photoUrl={player.photoUrl} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex items-baseline gap-2">
                      <span className="type-name">{playerName(player)}</span>{' '}
                      <span className="type-small text-text-muted">{positionLabel(player.position)}</span>
                    </span>{' '}
                    <span className="truncate type-small text-text-muted">{player.email ?? 'Sin correo'}</span>
                  </span>{' '}
                  <span className="flex flex-col items-end type-small text-text-muted">
                    <span>{statusLabel(player.status)}</span>{' '}
                    <span>{player.hasAccount ? 'Con cuenta' : 'Sin cuenta'}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </AdminPage>
  )
}
