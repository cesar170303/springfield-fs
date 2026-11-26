import { useId, useState } from 'react'
import { GOAL_TYPES, PENALTY_TYPES, missingGoals } from '../../../../domain/match'
import { missingGoalsText } from '../../match-format'
import { useAsync } from '../../use-async'
import { useUseCases } from '../../use-cases-context'
import ConfirmButton from './ConfirmButton'
import LoadError from './LoadError'
import { primaryButton, secondaryButton, textButton } from './styles'

/**
 * Goles y penaltis fallados del partido (docs/SPEC.md §12), pensado para el móvil: sin desplegables, con botones
 * grandes. Un gol normal son dos toques (quién marcó y quién asistió); un penalti se guarda al tocarlo. Goleador y
 * asistente, solo convocados con minutos. El marcador manda: avisa de los goles sin goleador, pero no bloquea.
 */
export default function GoalsEditor({ matchId, seasonId, goalsFor, onChanged }) {
  const { getMatchGoals, addGoal, deleteGoal, addMissedPenalty, deleteMissedPenalty } = useUseCases()
  const { data, error, reload } = useAsync(() => getMatchGoals({ matchId, seasonId }), `${matchId}-${seasonId}`)
  const [adding, setAdding] = useState(null) // null | 'goal' | 'missed': qué panel está abierto
  const [pick, setPick] = useState(null) // el jugador elegido en el primer paso
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState({ where: null, ok: '', error: '' }) // where: 'goals' | 'missed'

  function open(panel) {
    setAdding(panel)
    setPick(null)
    setResult({ where: null, ok: '', error: '' })
  }

  /**
   * Hace una acción, anuncia el resultado en su sección (`where`) y recarga. Si sale bien, cierra el panel; si falla,
   * lo deja abierto para reintentar. Los errores se enseñan aquí, también los de borrar.
   */
  async function run(where, action, ok) {
    if (busy) return
    setBusy(true)
    setResult({ where, ok: '', error: '' })
    try {
      await action()
      setResult({ where, ok, error: '' })
      setAdding(null)
      onChanged?.() // p. ej. «Terminar partido» vuelve a contar los goles que faltan
    } catch (e) {
      setResult({ where, ok: '', error: e.message })
    }
    setBusy(false)
    reload()
  }

  const saveGoal = (type, assistId = null) =>
    run('goals', () => addGoal({ matchId, scorerId: pick, assistId, type }), 'Gol añadido.')
  const saveMissed = (type) =>
    run('missed', () => addMissedPenalty({ matchId, playerId: pick, type }), 'Penalti fallado añadido.')

  const missing = data ? missingGoals(goalsFor, data.goals.length) : 0
  const canAddGoal = data?.players.length > 0 && goalsFor !== null && missing > 0

  return (
    <>
      <section aria-labelledby="goles" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="goles" className="type-title">
            Goles
          </h2>
          {data && (
            <span className="type-small text-text-muted">
              {goalsFor === null ? data.goals.length : `${data.goals.length} de ${goalsFor} con goleador`}
            </span>
          )}
        </div>
        {error && <LoadError message={error.message} onRetry={reload} />}
        {!data && !error && <p className="text-text-muted">Cargando…</p>}
        <Messages result={result} where="goals" />
        {data && (
          <>
            <EventList
              items={data.goals.map((g) => ({ id: g.id, who: g.scorer, detail: g.detail }))}
              what="el gol"
              onDelete={(id) => run('goals', () => deleteGoal(id), 'Gol borrado.')}
            />
            {goalsFor === null && (
              <p className="text-text-muted">Pon el resultado en «Datos del partido» para apuntar los goles.</p>
            )}
            {goalsFor !== null && data.players.length === 0 && (
              <p className="text-text-muted">
                Nadie tiene minutos todavía: guarda antes la convocatoria con sus minutos.
              </p>
            )}
            {missing > 0 && data.players.length > 0 && (
              <p className="type-small text-accent-text">{missingGoalsText(missing)}</p>
            )}
            {goalsFor !== null && goalsFor > 0 && missing === 0 && (
              <p className="type-small text-text-muted">Todos los goles a favor tienen goleador.</p>
            )}
            {canAddGoal && adding !== 'goal' && (
              <button type="button" onClick={() => open('goal')} className={primaryButton}>
                + Gol
              </button>
            )}
            {canAddGoal && adding === 'goal' && (
              <Panel onCancel={() => setAdding(null)}>
                <Choices
                  label="¿Quién marcó?"
                  options={data.players.map((p) => ({ value: p.playerId, label: p.name }))}
                  selected={pick}
                  onChoose={setPick}
                  busy={busy}
                />
                {pick !== null && (
                  <>
                    {/* Normal está marcado por defecto: tocar la asistencia lo guarda. Un penalti se guarda al tocarlo. */}
                    <Choices
                      label="¿Cómo?"
                      options={GOAL_TYPES}
                      selected="regular"
                      onChoose={(type) => type !== 'regular' && saveGoal(type)}
                      busy={busy}
                    />
                    <Choices
                      label="¿Asistencia?"
                      options={[
                        { value: null, label: 'Sin asistencia' },
                        ...data.players
                          .filter((p) => p.playerId !== pick)
                          .map((p) => ({ value: p.playerId, label: p.name })),
                      ]}
                      onChoose={(assistId) => saveGoal('regular', assistId)}
                      busy={busy}
                    />
                  </>
                )}
              </Panel>
            )}
          </>
        )}
      </section>

      {data && data.players.length > 0 && (
        <section aria-labelledby="penaltis-fallados" className="flex flex-col gap-3">
          <h2 id="penaltis-fallados" className="type-title">
            Penaltis fallados
          </h2>
          <Messages result={result} where="missed" />
          {data.missedPenalties.length === 0 ? (
            <p className="text-text-muted">Ninguno.</p>
          ) : (
            <EventList
              items={data.missedPenalties.map((p) => ({ id: p.id, who: p.player, detail: p.detail }))}
              what="el penalti fallado"
              onDelete={(id) => run('missed', () => deleteMissedPenalty(id), 'Penalti fallado borrado.')}
            />
          )}
          {adding !== 'missed' ? (
            <button type="button" onClick={() => open('missed')} className={secondaryButton}>
              + Penalti fallado
            </button>
          ) : (
            <Panel onCancel={() => setAdding(null)}>
              <Choices
                label="¿Quién lo falló?"
                options={data.players.map((p) => ({ value: p.playerId, label: p.name }))}
                selected={pick}
                onChoose={setPick}
                busy={busy}
              />
              {pick !== null && (
                <Choices label="¿De qué tipo?" options={PENALTY_TYPES} onChoose={saveMissed} busy={busy} />
              )}
            </Panel>
          )}
        </section>
      )}
    </>
  )
}

/** Panel de un alta paso a paso, con «Cancelar». */
function Panel({ onCancel, children }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg bg-surface p-4">
      {children}
      <button type="button" onClick={onCancel} className={secondaryButton}>
        Cancelar
      </button>
    </div>
  )
}

/**
 * Un paso: una pregunta y sus respuestas como botones grandes, fáciles de tocar en el móvil. El elegido se marca con
 * `aria-pressed`. Mientras guarda, los botones no responden (aria-disabled, para no perder el foco).
 */
function Choices({ label, options, selected, onChoose, busy }) {
  const id = useId()
  return (
    <div role="group" aria-labelledby={id} className="flex flex-col gap-2">
      <p id={id} className="type-small text-text-muted">
        {label}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map(({ value, label: text }) => {
          const on = selected !== undefined && value === selected
          return (
            <button
              key={String(value)}
              type="button"
              aria-pressed={selected !== undefined ? on : undefined}
              aria-disabled={busy}
              onClick={() => !busy && onChoose(value)}
              className={`min-h-12 rounded-md border px-3 type-body font-semibold ${
                on ? 'border-accent bg-accent text-on-accent' : 'border-border bg-bg'
              }`}
            >
              {text}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Lista de goles o penaltis fallados, cada uno con «Borrar» y confirmación en el sitio. */
function EventList({ items, what, onDelete }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id} className="flex min-h-14 items-center justify-between gap-3 border-t border-line">
          <span className="flex min-w-0 flex-col">
            <span className="type-body font-semibold">{item.who}</span>{' '}
            <span className="type-small text-text-muted">{item.detail}</span>
          </span>
          <ConfirmButton
            label="Borrar"
            ariaLabel={`Borrar ${what} de ${item.who}`}
            question={`¿Borrar ${what} de ${item.who}?`}
            confirmLabel="Sí, borrar"
            onConfirm={() => onDelete(item.id)}
            className={textButton}
          />
        </li>
      ))}
    </ul>
  )
}

/** Avisos de una sección: solo los de su última acción. La zona de estado está siempre, para que se anuncie. */
function Messages({ result, where }) {
  const mine = result.where === where
  return (
    <>
      {mine && result.error && (
        <p role="alert" className="type-small text-danger">
          {result.error}
        </p>
      )}
      <p role="status" className="type-small text-text-muted empty:sr-only">
        {mine ? result.ok : ''}
      </p>
    </>
  )
}
