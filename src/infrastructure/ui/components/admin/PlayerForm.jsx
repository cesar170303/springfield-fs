import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { STATUS_OPTIONS } from '../../../../domain/player'
import { POSITION_OPTIONS, playerName } from '../../../../domain/squad'
import { useAsync } from '../../use-async'
import { useUseCases } from '../../use-cases-context'
import AdminForm from './AdminForm'
import AdminPage from './AdminPage'
import ConfirmButton from './ConfirmButton'
import LoadError from './LoadError'
import PhotoField from './PhotoField'
import { field, input, secondaryButton } from './styles'

const PLAYERS = { to: '/admin/jugadores', label: 'Jugadores', name: 'Volver a jugadores' }
const EMPTY = { firstName: '', lastName: '', nickname: '', email: '', position: '', status: 'available' }

/** Alta (`/admin/jugadores/nuevo`) y edición (`/admin/jugadores/:playerId`) de una ficha (docs/SPEC.md §12). */
export default function PlayerForm() {
  const { playerId } = useParams()
  const { listPlayers, savePlayer, archivePlayer, restorePlayer } = useUseCases()
  const { data: players, error, reload } = useAsync(listPlayers, playerId ?? 'new')
  const { search } = useLocation()
  const navigate = useNavigate()
  // Al terminar, a la lista, que anuncia lo hecho.
  const backToList = (ok) => navigate({ pathname: PLAYERS.to, search }, { state: { ok } })

  if (!playerId) {
    return (
      <AdminPage title="Nueva ficha" back={PLAYERS}>
        <p className="type-small text-text-muted">La foto se pone al editar la ficha, una vez guardada.</p>
        <PlayerFields
          player={EMPTY}
          onSave={async (values) => {
            await savePlayer(values)
            backToList('Ficha guardada.')
          }}
          onCancel={() => backToList()}
        />
      </AdminPage>
    )
  }

  const player = players?.find((p) => String(p.id) === playerId)
  if (!player) {
    return (
      <AdminPage title="Jugadores" back={PLAYERS}>
        {error && <LoadError message={error.message} onRetry={reload} />}
        {!players && !error && <p className="text-text-muted">Cargando…</p>}
        {players && <p className="text-text-muted">Esta ficha no existe.</p>}
      </AdminPage>
    )
  }

  const name = playerName(player)
  return (
    <AdminPage title={name} back={PLAYERS}>
      <PhotoField player={player} onChanged={reload} />
      <PlayerFields
        player={player}
        onSave={async (values) => {
          await savePlayer({ ...values, id: player.id })
          backToList('Ficha guardada.')
        }}
        onCancel={() => backToList()}
      />
      <p className="type-small text-text-muted">
        {player.hasAccount
          ? 'Con cuenta vinculada.'
          : 'Sin cuenta. Se vinculará cuando se registre con ese correo y lo confirme.'}
      </p>
      {player.archived ? (
        <RestoreButton
          onRestore={async () => {
            await restorePlayer(player.id)
            backToList(`${name}, recuperado.`)
          }}
        />
      ) : (
        <ConfirmButton
          label="Archivar"
          question={`¿Archivar a ${name}? Conserva su historial y deja de salir en temporadas nuevas.`}
          confirmLabel="Sí, archivar"
          onConfirm={async () => {
            await archivePlayer(player.id)
            backToList(`${name}, archivado.`)
          }}
        />
      )}
    </AdminPage>
  )
}

function PlayerFields({ player, onSave, onCancel }) {
  const [values, setValues] = useState({
    firstName: player.firstName,
    lastName: player.lastName,
    nickname: player.nickname ?? '',
    email: player.email ?? '',
    position: player.position,
    status: player.status,
  })
  const bind = (key) => ({
    value: values[key],
    onChange: (e) => setValues({ ...values, [key]: e.target.value }),
    className: input,
  })

  return (
    <AdminForm onSubmit={() => onSave(values)} onCancel={onCancel}>
      <label className={field}>
        Apodo (opcional)
        <input type="text" autoComplete="off" {...bind('nickname')} />
      </label>
      <label className={field}>
        Nombre
        <input type="text" required autoComplete="off" {...bind('firstName')} />
      </label>
      <label className={field}>
        Apellidos
        <input type="text" required autoComplete="off" {...bind('lastName')} />
      </label>
      <label className={field}>
        Correo (opcional)
        <input type="email" autoComplete="off" {...bind('email')} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={field}>
          Posición
          <select required {...bind('position')}>
            <option value="" disabled>
              Elige…
            </option>
            {POSITION_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className={field}>
          Estado
          <select {...bind('status')}>
            {STATUS_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </AdminForm>
  )
}

/** Recuperar no pide confirmación: no pierde nada y se deshace archivando otra vez. */
function RestoreButton({ onRestore }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function restore() {
    setBusy(true)
    setError('')
    try {
      await onRestore()
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button type="button" disabled={busy} onClick={restore} className={secondaryButton}>
        Recuperar
      </button>
      {error && (
        <p role="alert" className="type-small text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
