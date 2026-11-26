import { useEffect, useRef, useState } from 'react'
import { playerName } from '../../../../domain/squad'
import { squarePhoto } from '../../image'
import { useUseCases } from '../../use-cases-context'
import ConfirmButton from './ConfirmButton'
import { primaryButton, secondaryButton, textButton } from './styles'

const frame = 'size-28 shrink-0 rounded-lg'

/**
 * Foto de la ficha (docs/SPEC.md §12): al elegirla se enseña ya recortada (512 × 512) y solo se sube al confirmar.
 * También se quita, con confirmación. `onChanged` recarga la ficha; `prepare` (squarePhoto) se cambia en los tests.
 */
export default function PhotoField({ player, onChanged, prepare = squarePhoto }) {
  const { changePhoto, removePhoto } = useUseCases()
  const name = playerName(player)
  const picker = useRef(null)
  const [preview, setPreview] = useState(null) // { photo, url }: la foto nueva, aún sin subir
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState({ ok: '', error: '' })

  // La vista previa es una URL local del navegador: se libera al cambiarla o al salir.
  useEffect(() => () => preview && URL.revokeObjectURL(preview.url), [preview])

  async function choose(event) {
    const file = event.target.files?.[0]
    event.target.value = '' // para poder elegir otra vez el mismo archivo
    if (!file) return
    setBusy(true)
    setResult({ ok: '', error: '' })
    try {
      const photo = await prepare(file)
      setPreview({ photo, url: URL.createObjectURL(photo.blob) })
    } catch (e) {
      setResult({ ok: '', error: e.message })
    }
    setBusy(false)
  }

  async function act(action, ok) {
    setBusy(true)
    setResult({ ok: '', error: '' })
    try {
      await action()
    } catch (e) {
      setResult({ ok: '', error: e.message }) // el error se enseña aquí, una sola vez
      setBusy(false)
      return
    }
    setPreview(null)
    setResult({ ok, error: '' })
    setBusy(false)
    onChanged()
  }

  return (
    <section aria-label="Foto" className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        {preview ? (
          <img src={preview.url} alt="Vista previa de la foto nueva" className={`${frame} object-cover`} />
        ) : player.photoUrl ? (
          <img src={player.photoUrl} alt={`Foto de ${name}`} className={`${frame} object-cover`} />
        ) : (
          <span
            className={`${frame} grid place-items-center border border-border bg-surface type-small text-text-muted`}
          >
            Sin foto
          </span>
        )}
        <div className="flex flex-1 flex-col gap-2">
          {preview ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => act(() => changePhoto(player, preview.photo), 'Foto guardada.')}
                className={primaryButton}
              >
                Usar esta foto
              </button>
              <button type="button" disabled={busy} onClick={() => setPreview(null)} className={secondaryButton}>
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button type="button" disabled={busy} onClick={() => picker.current.click()} className={secondaryButton}>
                {busy ? 'Preparando…' : player.photoUrl ? 'Cambiar foto' : 'Poner foto'}
              </button>
              {player.photoUrl && (
                <ConfirmButton
                  label="Quitar foto"
                  question={`¿Quitar la foto de ${name}? Saldrán sus iniciales.`}
                  confirmLabel="Sí, quitar"
                  onConfirm={() => act(() => removePhoto(player), 'Foto quitada.')}
                  className={textButton}
                />
              )}
            </>
          )}
        </div>
      </div>
      {/* El botón de arriba abre este selector: así se ve como los demás botones y se maneja con teclado. */}
      <input ref={picker} type="file" accept="image/*" aria-label="Elegir foto" hidden onChange={choose} />
      <p className="type-small text-text-muted">Se recorta el centro en cuadrado.</p>
      {result.error && (
        <p role="alert" className="type-small text-danger">
          {result.error}
        </p>
      )}
      <p role="status" className="type-small text-text-muted empty:sr-only">
        {result.ok}
      </p>
    </section>
  )
}
