import { useState } from 'react'
import { canHaveResult, nextRound } from '../../../../domain/match'
import { fromLocalParts, nextSaturday, timeOptions, toLocalDay, toLocalTime } from '../../match-format'
import AdminForm from './AdminForm'
import { field, input } from './styles'

const asText = (value) => (value === null || value === undefined ? '' : String(value))
const chip = 'min-h-11 rounded-full border border-border px-4 type-small'

/** Fecha válida y aún por llegar: el partido no puede tener resultado. */
const isFuture = (day, time) => {
  const date = fromLocalParts(day, time)
  return !Number.isNaN(date.getTime()) && !canHaveResult(date)
}

/**
 * «Datos del partido» (docs/SPEC.md §12): competición, jornada, rival, fecha, hora y resultado. Con `matches` (al
 * crear) propone la jornada siguiente de la competición elegida; `defaultTime` es la hora que se propone. Fecha y
 * hora van en la hora local del dispositivo. Con fecha futura no hay resultado (se vacía y se desactiva).
 */
export default function MatchForm({ match, competitions, matches, defaultTime = '18:30', onSave, onCancel }) {
  const [values, setValues] = useState({
    competitionId: match.competitionId,
    round: asText(match.round),
    opponent: match.opponent,
    day: match.date ? toLocalDay(match.date) : '',
    time: match.date ? toLocalTime(match.date) : defaultTime,
    goalsFor: asText(match.goalsFor),
    goalsAgainst: asText(match.goalsAgainst),
  })
  const future = isFuture(values.day, values.time)

  // Al cambiar fecha u hora: si el partido pasa a ser futuro, su resultado se borra.
  function change(changes) {
    const next = { ...values, ...changes }
    setValues(isFuture(next.day, next.time) ? { ...next, goalsFor: '', goalsAgainst: '' } : next)
  }
  const bind = (key) => ({ value: values[key], onChange: (e) => change({ [key]: e.target.value }), className: input })

  function chooseCompetition(e) {
    const competitionId = Number(e.target.value)
    change({ competitionId, round: matches ? String(nextRound(matches, competitionId)) : values.round })
  }

  return (
    <AdminForm
      onSubmit={() => {
        const { day, time, ...rest } = values
        return onSave({ ...rest, date: fromLocalParts(day, time) })
      }}
      onCancel={onCancel}
    >
      <div className="grid grid-cols-[1fr_6rem] gap-3">
        <label className={field}>
          Competición
          <select value={values.competitionId} onChange={chooseCompetition} className={input}>
            {competitions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className={field}>
          Jornada
          <input type="number" inputMode="numeric" min="1" required {...bind('round')} />
        </label>
      </div>
      <label className={field}>
        Rival
        <input type="text" required autoComplete="off" {...bind('opponent')} />
      </label>
      <div className="grid grid-cols-[1fr_7rem] gap-3">
        <label className={field}>
          Fecha
          <input
            type="date"
            required
            {...bind('day')}
            // Abre el calendario al tocar el campo, no solo su icono (si el navegador lo permite).
            onClick={(e) => {
              try {
                e.currentTarget.showPicker?.()
              } catch {
                // Sin gesto del usuario o en un iframe ajeno no se puede: se escribe a mano.
              }
            }}
          />
        </label>
        <label className={field}>
          Hora
          <select {...bind('time')}>
            {timeOptions(values.time).map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => change({ day: toLocalDay(new Date()) })} className={chip}>
          Hoy
        </button>
        <button type="button" onClick={() => change({ day: toLocalDay(nextSaturday()) })} className={chip}>
          Próximo sábado
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className={field}>
          Goles a favor
          <input
            type="number"
            inputMode="numeric"
            min="0"
            disabled={future}
            aria-describedby={future ? 'sin-resultado' : undefined}
            {...bind('goalsFor')}
          />
        </label>
        <label className={field}>
          Goles en contra
          <input
            type="number"
            inputMode="numeric"
            min="0"
            disabled={future}
            aria-describedby={future ? 'sin-resultado' : undefined}
            {...bind('goalsAgainst')}
          />
        </label>
      </div>
      {future && (
        <p id="sin-resultado" className="type-small text-text-muted">
          El resultado se pone cuando el partido ya se ha jugado.
        </p>
      )}
    </AdminForm>
  )
}
