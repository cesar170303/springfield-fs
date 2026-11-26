import { useState } from 'react'
import { useAsync } from '../../use-async'
import { useSeasonFilters } from '../../use-season-filters'
import { useUseCases } from '../../use-cases-context'
import SeasonFilters from '../SeasonFilters'
import AdminPage from './AdminPage'
import LoadError from './LoadError'

const pending = () => new Promise(() => {}) // hasta que la URL tenga temporada, no se pide nada

/** Votantes de cada temporada (docs/SPEC.md §12): los viewers, cada uno con su interruptor. La plantilla vota siempre. */
export default function VotersAdmin() {
  const season = useSeasonFilters()
  const { seasonId } = season
  const { getSeasonVoters, setSeasonVoter } = useUseCases()
  const { data: viewers, error, reload } = useAsync(seasonId ? () => getSeasonVoters(seasonId) : pending, seasonId)
  const [saving, setSaving] = useState(null) // id de la cuenta que se está guardando
  const [result, setResult] = useState({ ok: '', error: '' })
  const seasonName = season.filters?.seasons.find((s) => s.id === seasonId)?.name

  async function toggle(viewer) {
    if (saving) return
    setSaving(viewer.id)
    setResult({ ok: '', error: '' })
    try {
      await setSeasonVoter({ seasonId, userId: viewer.id, votes: !viewer.votes })
      setResult({ ok: `${viewer.name} ${viewer.votes ? 'ya no vota' : 'vota'} en ${seasonName}.`, error: '' })
    } catch (e) {
      setResult({ ok: '', error: e.message })
    }
    setSaving(null)
    reload()
  }

  return (
    <AdminPage title="Votantes" action={<SeasonFilters {...season} showCompetition={false} />}>
      <p className="type-body text-text-muted">
        La plantilla vota siempre. Aquí eliges qué viewers votan también en esta temporada.
      </p>
      {season.failed && <LoadError message="No se pudieron cargar las temporadas." onRetry={season.retry} />}
      {error && <LoadError message={error.message} onRetry={reload} />}
      {result.error && (
        <p role="alert" className="type-small text-danger">
          {result.error}
        </p>
      )}
      <p role="status" className="type-small text-text-muted empty:sr-only">
        {result.ok}
      </p>
      {seasonId && !viewers && !error && <p className="text-text-muted">Cargando…</p>}
      {viewers?.length === 0 && (
        <p className="text-text-muted">
          Aún no hay ningún viewer. Las cuentas que no son de la plantilla aparecen aquí al registrarse.
        </p>
      )}
      <ul className="grid md:grid-cols-2 md:gap-x-8">
        {viewers?.map((viewer) => (
          <li key={viewer.id} className="border-t border-line">
            <label className="flex min-h-16 cursor-pointer items-center justify-between gap-3 py-2">
              <span className="flex min-w-0 flex-col">
                <span className="type-body font-semibold">{viewer.name}</span>{' '}
                <span className="truncate type-small text-text-muted">{viewer.email}</span>
              </span>
              <input
                type="checkbox"
                role="switch"
                aria-label={`${viewer.name} vota en ${seasonName}`}
                checked={viewer.votes}
                // aria-disabled y no disabled: un control desactivado pierde el foco (el doble toque lo frena toggle).
                aria-disabled={saving !== null}
                onChange={() => toggle(viewer)}
                className="peer sr-only"
              />
              {/* El interruptor que se ve; el checkbox de arriba es el que se lee y se maneja con teclado. */}
              <span
                aria-hidden="true"
                className="flex h-7 w-12 shrink-0 items-center rounded-full border border-border bg-line p-0.5 peer-checked:justify-end peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus peer-aria-disabled:opacity-60"
              >
                <span className="size-5 rounded-full bg-text" />
              </span>
            </label>
          </li>
        ))}
      </ul>
    </AdminPage>
  )
}
