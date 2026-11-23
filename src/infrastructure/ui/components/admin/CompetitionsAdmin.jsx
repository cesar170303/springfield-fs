import { useState } from 'react'
import { COMPETITION_TYPES, competitionTypeLabel } from '../../../../domain/match'
import { useAsync } from '../../use-async'
import { useEditor } from '../../use-editor'
import { useUseCases } from '../../use-cases-context'
import AdminForm from './AdminForm'
import EditableSection from './EditableSection'
import { field, input, textButton } from './styles'

/** Competiciones (docs/SPEC.md §12): crear, editar y borrar (sin partidos). */
export default function CompetitionsAdmin() {
  const { listCompetitions, saveCompetition, deleteCompetition } = useUseCases()
  const { data: competitions, error, reload } = useAsync(listCompetitions)
  const editor = useEditor(reload)
  const save = (competition) => editor.save(() => saveCompetition(competition), 'Competición guardada.')

  return (
    <EditableSection
      title="Competiciones"
      newLabel="Nueva competición"
      editor={editor}
      loadError={error}
      onRetry={reload}
    >
      {editor.editing === 'new' && (
        <CompetitionForm
          competition={{ name: '', type: COMPETITION_TYPES[0].value }}
          onSave={save}
          onCancel={editor.close}
        />
      )}
      {!competitions && !error && <p className="text-text-muted">Cargando…</p>}
      {competitions?.length === 0 && (
        <p className="text-text-muted">Aún no hay ninguna competición. Crea la primera.</p>
      )}
      <ul>
        {competitions?.map((competition) => (
          <li key={competition.id} className="border-t border-line py-2">
            {editor.editing === competition.id ? (
              <CompetitionForm
                competition={competition}
                onSave={save}
                onCancel={editor.close}
                onDelete={() => editor.save(() => deleteCompetition(competition.id), 'Competición borrada.')}
              />
            ) : (
              <div className="flex items-center justify-between gap-x-3">
                <div className="min-w-0">
                  <p className="type-body font-semibold">{competition.name}</p>
                  <p className="type-small text-text-muted">{competitionTypeLabel(competition.type)}</p>
                </div>
                <button
                  type="button"
                  aria-label={`Editar ${competition.name}`}
                  onClick={() => editor.open(competition.id)}
                  className={`-mx-2 ${textButton}`}
                >
                  Editar
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </EditableSection>
  )
}

function CompetitionForm({ competition, onSave, onCancel, onDelete }) {
  const [values, setValues] = useState(competition)
  const bind = (key) => ({
    value: values[key],
    onChange: (e) => setValues({ ...values, [key]: e.target.value }),
    className: input,
  })

  return (
    <AdminForm
      onSubmit={() => onSave(values)}
      onCancel={onCancel}
      onDelete={onDelete}
      deleteQuestion={`¿Borrar ${competition.name}? No se puede deshacer.`}
    >
      <label className={field}>
        Nombre
        <input type="text" required autoFocus {...bind('name')} />
      </label>
      <label className={field}>
        Tipo
        <select {...bind('type')}>
          {COMPETITION_TYPES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </AdminForm>
  )
}
