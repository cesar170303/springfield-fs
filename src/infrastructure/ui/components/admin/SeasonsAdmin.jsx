import { useState } from 'react'
import { formatDay } from '../../format'
import { useAsync } from '../../use-async'
import { useEditor } from '../../use-editor'
import { useUseCases } from '../../use-cases-context'
import AdminForm from './AdminForm'
import EditableSection from './EditableSection'
import { field, input, textButton } from './styles'

/** Temporadas (docs/SPEC.md §12): crear, editar, borrar (sin partidos) y marcar la actual. */
export default function SeasonsAdmin() {
  const { listSeasons, saveSeason, setCurrentSeason, deleteSeason } = useUseCases()
  const { data: seasons, error, reload } = useAsync(listSeasons)
  const editor = useEditor(reload)
  const save = (season) => editor.save(() => saveSeason(season), 'Temporada guardada.')

  return (
    <EditableSection title="Temporadas" newLabel="Nueva temporada" editor={editor} loadError={error}>
      {editor.editing === 'new' && (
        <SeasonForm season={{ name: '', startDate: '', endDate: '' }} onSave={save} onCancel={editor.close} />
      )}
      {!seasons && !error && <p className="text-text-muted">Cargando…</p>}
      {seasons?.length === 0 && <p className="text-text-muted">Aún no hay ninguna temporada. Crea la primera.</p>}
      <ul>
        {seasons?.map((season) => (
          <li key={season.id} className="border-t border-line py-2">
            {editor.editing === season.id ? (
              <SeasonForm
                season={season}
                onSave={save}
                onCancel={editor.close}
                onDelete={() => editor.save(() => deleteSeason(season.id), 'Temporada borrada.')}
              />
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
                      aria-label={`Marcar como actual: ${season.name}`}
                      onClick={() =>
                        editor.run(() => setCurrentSeason(season.id), `${season.name} es la temporada actual.`)
                      }
                      className={textButton}
                    >
                      Marcar como actual
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={`Editar ${season.name}`}
                    onClick={() => editor.open(season.id)}
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
    </EditableSection>
  )
}

function SeasonForm({ season, onSave, onCancel, onDelete }) {
  const { id } = season
  const [values, setValues] = useState({ name: season.name, startDate: season.startDate, endDate: season.endDate })
  const bind = (key) => ({
    value: values[key],
    onChange: (e) => setValues({ ...values, [key]: e.target.value }),
    required: true,
    className: input,
  })

  return (
    <AdminForm
      onSubmit={() => onSave(id ? { id, ...values } : values)}
      onCancel={onCancel}
      onDelete={onDelete}
      deleteQuestion={`¿Borrar ${season.name}? Se borran también su plantilla y sus votantes. No se puede deshacer.`}
    >
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
    </AdminForm>
  )
}
