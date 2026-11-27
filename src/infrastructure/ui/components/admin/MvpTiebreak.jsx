import { useState } from 'react'
import { formatStat } from '../../format'
import { useAsync } from '../../use-async'
import { useUseCases } from '../../use-cases-context'
import { primaryButton } from './styles'

/**
 * Desempate de MVP (docs/SPEC.md §6 y §12): con la votación cerrada y empate en la mejor media, el admin elige entre
 * los empatados y puede cambiarlo. Sin empate no aparece: la base de datos solo da empates de partidos con la votación
 * cerrada, así que con la votación abierta no se ve ninguna media. `onDone(mensaje)` al guardar.
 */
export default function MvpTiebreak({ matchId, seasonId, chosenId, onDone }) {
  const { getMvpTie, saveMvp } = useUseCases()
  const { data: tied } = useAsync(() => getMvpTie({ matchId, seasonId }), `${matchId}-${seasonId}`)
  const [picked, setPicked] = useState(chosenId)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!tied?.length) return null

  async function save() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await saveMvp({ matchId, playerId: picked })
      onDone(`MVP guardado: ${tied.find((p) => p.playerId === picked).name}.`)
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="empate-mvp" className="flex flex-col gap-3 rounded-lg bg-surface p-4">
      <h2 id="empate-mvp" className="type-title">
        Empate de MVP
      </h2>
      <p className="type-small text-text-muted">Elige entre los que empatan. Puedes cambiarlo después.</p>
      <div role="radiogroup" aria-labelledby="empate-mvp">
        {tied.map((p) => (
          <label key={p.playerId} className="flex min-h-14 items-center justify-between gap-3 border-t border-line">
            <span className="flex items-center gap-3">
              <input
                type="radio"
                name={`mvp-${matchId}`}
                checked={picked === p.playerId}
                onChange={() => setPicked(p.playerId)}
                className="size-5 accent-accent"
              />
              <span className="type-name">{p.name}</span>
            </span>
            <span className="type-name tabular-nums">{formatStat(p.rating, 1)}</span>
          </label>
        ))}
      </div>
      {error && (
        <p role="alert" className="type-small text-danger">
          {error}
        </p>
      )}
      <button type="button" aria-disabled={busy} onClick={save} className={primaryButton}>
        Guardar MVP
      </button>
    </section>
  )
}
