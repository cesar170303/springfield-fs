import { useRef, useState } from 'react'
import { formatDay } from '../../format'
import { useAsync } from '../../use-async'
import { useUseCases } from '../../use-cases-context'
import AdminPage from './AdminPage'
import { field, input, primaryButton, secondaryButton, textButton } from './styles'

const EMPTY = { name: '', startDate: '', endDate: '' }

/** Temporadas (docs/SPEC.md §12): crear, editar y marcar la actual. No se borran. */
export default function SeasonsAdmin() {
  const { listSeasons, saveSeason, setCurrentSeason } = useUseCases()
  const { data: seasons, error: loadError, reload } = useAsync(listSeasons)
  const [editing, setEditing] = useState(null) // null = sin formulario; 'new' o el id de la temporada
  const [result, setResult] = useState({ ok: '', error: '' }) // lo que se anuncia tras cada acción
  const newButton = useRef(null)

  function close() {
    setEditing(null)
    newButton.current?.focus() // el formulario desaparece: el foco no se puede quedar en el aire
  }

  function open(which) {
    setResult({ ok: '', error: '' })
    setEditing(which)
  }

  async function save(season) {
    await saveSeason(season)
    setResult({ ok: 'Temporada guardada.', error: '' })
    close()
    reload()
  }

  async function markCurrent({ id, name }) {
    try {
      await setCurrentSeason(id)
      setResult({ ok: `${name} es la temporada actual.`, error: '' })
      newButton.current?.focus() // el botón pulsado desaparece
    } catch (error) {
      setResult({ ok: '', error: error.message })
    }
    reload() // también si falla: puede que la anterior ya no esté marcada
  }

  const error = result.error || loadError?.message

  return (
    <AdminPage
      title="Temporadas"
      action={
        <button ref={newButton} type="button" onClick={() => open('new')} className={primaryButton}>
          Nueva temporada
        </button>
      }
    >
      {error && (
        <p role="alert" className="type-small text-danger">
          {error}
        </p>
      )}
      <p role="status" className="type-small text-text-muted empty:sr-only">
        {result.ok}
      </p>
      {editing === 'new' && <SeasonForm season={EMPTY} onSave={save} onCancel={close} />}
      {!seasons && !loadError && <p className="text-text-muted">Cargando…</p>}
      {seasons?.length === 0 && <p className="text-text-muted">Aún no hay ninguna temporada. Crea la primera.</p>}
      <ul>
        {seasons?.map((season) => (
          <li key={season.id} className="border-t border-line py-2">
            {editing === season.id ? (
              <SeasonForm season={season} onSave={save} onCancel={close} />
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-x-3">
                <div>
                  <p className="type-body font-semibold">
                    {season.name}
                    {season.isCurrent && <span className="ml-2 type-small text-accent-text">Actual</span>}
                  </p>
                  <p className="type-small text-text-muted">
                    {formatDay(season.startDate)} – {formatDay(season.endDate)}
                  </p>
                </div>
                <div className="-mx-2 flex gap-1">
                  {!season.isCurrent && (
                    <button
                      type="button"
                      aria-label={`Marcar ${season.name} como actual`}
                      onClick={() => markCurrent(season)}
                      className={textButton}
                    >
                      Marcar como actual
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={`Editar ${season.name}`}
                    onClick={() => open(season.id)}
                    className={textButton}
                  >
                    Editar
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </AdminPage>
  )
}

function SeasonForm({ season, onSave, onCancel }) {
  const [values, setValues] = useState({ name: season.name, startDate: season.startDate, endDate: season.endDate })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const bind = (key) => ({
    value: values[key],
    onChange: (e) => setValues({ ...values, [key]: e.target.value }),
    required: true,
    className: input,
  })

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave(season.id ? { id: season.id, ...values } : values)
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-lg bg-surface p-4">
      <label className={field}>
        Nombre
        <input type="text" placeholder="2026/27" autoFocus {...bind('name')} />
      </label>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className={field}>
          Inicio
          <input type="date" {...bind('startDate')} />
        </label>
        <label className={field}>
          Fin
          <input type="date" {...bind('endDate')} />
        </label>
      </div>
      {error && (
        <p role="alert" className="type-small text-danger">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className={primaryButton}>
          Guardar
        </button>
        <button type="button" onClick={onCancel} className={secondaryButton}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
