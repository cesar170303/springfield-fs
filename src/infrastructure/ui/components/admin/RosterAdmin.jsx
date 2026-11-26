import { useState } from 'react'
import { playerName, positionLabel } from '../../../../domain/squad'
import { useAsync } from '../../use-async'
import { useEditor } from '../../use-editor'
import { useSeasonFilters } from '../../use-season-filters'
import { useUseCases } from '../../use-cases-context'
import PlayerAvatar from '../PlayerAvatar'
import SeasonFilters from '../SeasonFilters'
import AdminForm from './AdminForm'
import AdminPage from './AdminPage'
import EditableSection from './EditableSection'
import LoadError from './LoadError'
import { field, input, primaryButton, textButton } from './styles'

const REMOVE = { action: 'Quitar', confirm: 'Sí, quitar', keep: 'No quitar' }
const pending = () => new Promise(() => {}) // hasta que la URL tenga temporada, no se pide nada

/** Plantilla y dorsales de cada temporada (docs/SPEC.md §12): añadir, cambiar el dorsal, quitar y copiar la anterior. */
export default function RosterAdmin() {
  const season = useSeasonFilters()
  const { seasonId } = season
  const { getRosterSheet, addToRoster, changeShirtNumber, removeFromRoster, copyRoster } = useUseCases()
  const { data: sheet, error, reload } = useAsync(seasonId ? () => getRosterSheet(seasonId) : pending, seasonId)
  const editor = useEditor(reload)
  const seasonName = season.filters?.seasons.find((s) => s.id === seasonId)?.name

  return (
    <AdminPage title="Plantilla y dorsales" action={<SeasonFilters {...season} showCompetition={false} />}>
      {season.failed && <LoadError message="No se pudieron cargar las temporadas." onRetry={season.retry} />}
      {season.filters?.initialSeasonId === null && (
        <p className="text-text-muted">Aún no hay ninguna temporada. Créala en «Temporadas y competiciones».</p>
      )}
      {seasonId && (
        <EditableSection
          title={sheet ? `Jugadores, ${sheet.roster.length}` : 'Jugadores'}
          newLabel="Añadir jugador"
          editor={editor}
          loadError={error}
          onRetry={reload}
        >
          {editor.editing === 'new' &&
            sheet && // hasta que cargue no se sabe qué fichas quedan libres
            (sheet.available.length ? (
              <AddForm
                players={sheet.available}
                onSave={(values) => editor.save(() => addToRoster({ seasonId, ...values }), 'Jugador añadido.')}
                onCancel={editor.close}
              />
            ) : (
              <p className="text-text-muted">Todas las fichas activas ya están en la plantilla.</p>
            ))}
          {!sheet && !error && <p className="text-text-muted">Cargando…</p>}
          {sheet?.roster.length === 0 &&
            (sheet.copyFrom ? (
              <div className="flex flex-col items-start gap-3 rounded-lg bg-surface p-4">
                <p className="type-body">La plantilla de esta temporada está vacía.</p>
                <button
                  type="button"
                  onClick={() => editor.run(() => copyRoster(seasonId), 'Plantilla copiada.')}
                  className={primaryButton}
                >
                  Copiar la plantilla de {sheet.copyFrom.seasonName} ({sheet.copyFrom.count} jugadores)
                </button>
              </div>
            ) : (
              <p className="text-text-muted">La plantilla de esta temporada está vacía. Añade jugadores.</p>
            ))}
          <ul className="grid md:grid-cols-2 md:gap-x-8">
            {sheet?.roster.map((player) => {
              const name = playerName(player)
              return (
                <li key={player.id} className="border-t border-line py-2">
                  {editor.editing === player.id ? (
                    <ShirtForm
                      player={player}
                      onSave={(shirtNumber) =>
                        editor.save(
                          () => changeShirtNumber({ seasonId, playerId: player.id, shirtNumber }),
                          'Dorsal cambiado.',
                        )
                      }
                      onCancel={editor.close}
                      onDelete={() =>
                        editor.save(
                          () => removeFromRoster({ seasonId, playerId: player.id }),
                          `${name}, fuera de la plantilla.`,
                        )
                      }
                      deleteQuestion={`¿Quitar a ${name} de la plantilla de ${seasonName}?`}
                    />
                  ) : (
                    <div className="flex min-h-12 items-center gap-3">
                      <span className="grid h-7 min-w-9 place-items-center rounded-full bg-accent px-2 type-small font-semibold text-on-accent">
                        {player.shirtNumber}
                      </span>
                      <PlayerAvatar name={name} photoUrl={player.photoUrl} />
                      <span className="flex min-w-0 flex-1 items-baseline gap-2">
                        <span className="type-name">{name}</span>{' '}
                        <span className="type-small text-text-muted">{positionLabel(player.position)}</span>
                      </span>
                      <button
                        type="button"
                        aria-label={`Editar ${name}`}
                        onClick={() => editor.open(player.id)}
                        className={`-mx-2 ${textButton}`}
                      >
                        Editar
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </EditableSection>
      )}
    </AdminPage>
  )
}

function AddForm({ players, onSave, onCancel }) {
  const [playerId, setPlayerId] = useState(players[0].id)
  const [shirtNumber, setShirtNumber] = useState('')

  return (
    <AdminForm onSubmit={() => onSave({ playerId, shirtNumber })} onCancel={onCancel}>
      <div className="grid grid-cols-[1fr_6rem] gap-3">
        <label className={field}>
          Jugador
          <select autoFocus value={playerId} onChange={(e) => setPlayerId(Number(e.target.value))} className={input}>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {playerName(p)}
              </option>
            ))}
          </select>
        </label>
        <ShirtInput value={shirtNumber} onChange={setShirtNumber} />
      </div>
    </AdminForm>
  )
}

function ShirtForm({ player, onSave, onCancel, onDelete, deleteQuestion }) {
  const [shirtNumber, setShirtNumber] = useState(String(player.shirtNumber))

  return (
    <AdminForm
      onSubmit={() => onSave(shirtNumber)}
      onCancel={onCancel}
      onDelete={onDelete}
      deleteQuestion={deleteQuestion}
      deleteLabels={REMOVE}
    >
      <p className="type-body font-semibold">{playerName(player)}</p>
      <ShirtInput value={shirtNumber} onChange={setShirtNumber} autoFocus />
    </AdminForm>
  )
}

function ShirtInput({ value, onChange, autoFocus }) {
  return (
    <label className={field}>
      Dorsal
      <input
        type="number"
        inputMode="numeric"
        min="1"
        max="99"
        required
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={input}
      />
    </label>
  )
}
