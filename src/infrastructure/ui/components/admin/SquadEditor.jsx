import { useState } from 'react'
import { useAsync } from '../../use-async'
import { useUseCases } from '../../use-cases-context'
import LoadError from './LoadError'
import { primaryButton } from './styles'

// Clases escritas enteras: Tailwind solo genera las que encuentra tal cual en el código.
const CARD_ON = { yellow: 'border-card-yellow bg-card-yellow', red: 'border-danger bg-danger' }
const card = (on, kind) =>
  `block h-[22px] w-4 rounded-[3px] border-[1.5px] ${on ? CARD_ON[kind] : 'border-border bg-bg'}`

/**
 * Convocatoria del partido (docs/SPEC.md §12): de la plantilla, quién va convocado, sus minutos y sus tarjetas.
 * Lo que se ve es lo guardado más los cambios sin guardar (`edits`). Guardado, avisa con `onSaved`; si la base de datos
 * lo rechaza, enseña su frase, descarta los cambios y recarga, así la lista vuelve a su estado real.
 */
export default function SquadEditor({ matchId, seasonId, onSaved }) {
  const { getMatchSquad, saveMatchSquad } = useUseCases()
  const { data, error, reload } = useAsync(() => getMatchSquad({ matchId, seasonId }), `${matchId}-${seasonId}`)
  const [edits, setEdits] = useState({}) // playerId → cambios sin guardar
  const [busy, setBusy] = useState(false)
  const [saveError, setSaveError] = useState('')

  const rows = (data ?? []).map((p) => ({
    ...p,
    minutes: p.called ? String(p.minutes) : '',
    ...edits[p.playerId],
  }))
  const edit = (playerId, changes) => setEdits((all) => ({ ...all, [playerId]: { ...all[playerId], ...changes } }))

  async function save() {
    if (busy) return
    setBusy(true)
    setSaveError('')
    try {
      await saveMatchSquad({
        matchId,
        squad: rows.map(({ playerId, called, minutes, yellow, red }) => ({ playerId, called, minutes, yellow, red })),
      })
    } catch (e) {
      // Se queda aquí: la frase a la vista y la lista vuelve a lo guardado.
      setSaveError(e.message)
      setEdits({})
      setBusy(false)
      reload()
      return
    }
    onSaved() // quien lo usa decide adónde ir (el editor vuelve a la lista de partidos)
  }

  return (
    <section aria-labelledby="convocatoria" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="convocatoria" className="type-title">
          Convocatoria
        </h2>
        {data?.length > 0 && (
          <span className="type-small text-text-muted">
            {rows.filter((p) => p.called).length} de {rows.length}
          </span>
        )}
      </div>
      {error && <LoadError message={error.message} onRetry={reload} />}
      {!data && !error && <p className="text-text-muted">Cargando…</p>}
      {data?.length === 0 && (
        <p className="text-text-muted">
          La plantilla de esta temporada está vacía: añade jugadores en «Plantilla y dorsales».
        </p>
      )}
      {data?.length > 0 && (
        <>
          <div aria-hidden="true" className="flex justify-end gap-1 type-label text-text-muted">
            <span className="w-14 text-center">Min.</span>
            <span className="w-11 text-center">Amar.</span>
            <span className="w-11 text-center">Roja</span>
          </div>
          <ul>
            {rows.map((p) => {
              // Con goles o penaltis apuntados no se puede quitar: la base de datos tampoco lo deja.
              const locked = p.called && !p.canLeave
              return (
                <li key={p.playerId} className="flex min-h-14 items-center gap-1 border-t border-line">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <label className="flex min-h-11 items-center gap-3">
                      <input
                        type="checkbox"
                        checked={p.called}
                        aria-disabled={locked}
                        aria-describedby={locked ? `bloqueado-${p.playerId}` : undefined}
                        onChange={() => !locked && edit(p.playerId, { called: !p.called })}
                        className="size-5 shrink-0 accent-accent"
                      />
                      <span className={`truncate type-name ${p.called ? '' : 'text-text-muted'}`}>{p.name}</span>
                    </label>
                    {locked && (
                      <span id={`bloqueado-${p.playerId}`} className="-mt-2 pb-2 pl-8 type-small text-text-muted">
                        Tiene goles o penaltis: bórralos antes de quitarle.
                      </span>
                    )}
                  </div>
                  {p.called && (
                    <>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        max="40"
                        aria-label={`Minutos de ${p.name}`}
                        value={p.minutes}
                        onChange={(e) => edit(p.playerId, { minutes: e.target.value })}
                        className="min-h-11 w-14 rounded-sm border border-border bg-bg text-center type-body tabular-nums"
                      />
                      <button
                        type="button"
                        aria-pressed={p.yellow}
                        aria-label={`Amarilla a ${p.name}`}
                        onClick={() => edit(p.playerId, { yellow: !p.yellow })}
                        className="grid size-11 place-items-center"
                      >
                        <span className={card(p.yellow, 'yellow')} />
                      </button>
                      <button
                        type="button"
                        aria-pressed={p.red}
                        aria-label={`Roja a ${p.name}`}
                        onClick={() => edit(p.playerId, { red: !p.red })}
                        className="grid size-11 place-items-center"
                      >
                        <span className={card(p.red, 'red')} />
                      </button>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
          <p className="type-small text-text-muted">Doble amarilla: marca solo la roja.</p>
          {saveError && (
            <p role="alert" className="type-small text-danger">
              {saveError}
            </p>
          )}
          <button type="button" aria-disabled={busy} onClick={save} className={primaryButton}>
            Guardar convocatoria
          </button>
        </>
      )}
    </section>
  )
}
