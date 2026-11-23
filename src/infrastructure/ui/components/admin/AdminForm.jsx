import { useState } from 'react'
import { dangerButton, primaryButton, secondaryButton } from './styles'

/**
 * Formulario del panel. Si `onSubmit` u `onDelete` fallan, enseña la frase del error y sigue abierto con lo escrito.
 * Con `onDelete` (al editar) lleva «Borrar», que pregunta `deleteQuestion` en el sitio antes de hacerlo.
 */
export default function AdminForm({ onSubmit, onCancel, onDelete, deleteQuestion, children }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [asking, setAsking] = useState(false)
  const [asked, setAsked] = useState(false) // al volver de la pregunta, el foco va a «Borrar»

  async function attempt(action) {
    setBusy(true)
    setError('')
    try {
      await action() // si sale bien, quien lo usa cierra el formulario
    } catch (e) {
      setError(e.message)
      setAsking(false)
      setBusy(false)
    }
  }

  function submit(event) {
    event.preventDefault()
    // Con la pregunta abierta no hay botón de guardar, pero Intro en un campo envía el formulario igual.
    if (!asking) attempt(onSubmit)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-lg bg-surface p-4">
      {children}
      {error && (
        <p role="alert" className="type-small text-danger">
          {error}
        </p>
      )}
      {asking ? (
        <>
          <p className="type-small">{deleteQuestion}</p>
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => attempt(onDelete)} className={dangerButton}>
              Sí, borrar
            </button>
            <button
              type="button"
              autoFocus
              disabled={busy}
              onClick={() => setAsking(false)}
              className={secondaryButton}
            >
              No borrar
            </button>
          </div>
        </>
      ) : (
        <div className="flex gap-2">
          <button type="submit" disabled={busy} className={primaryButton}>
            Guardar
          </button>
          <button type="button" disabled={busy} onClick={onCancel} className={secondaryButton}>
            Cancelar
          </button>
          {onDelete && (
            <button
              type="button"
              autoFocus={asked}
              disabled={busy}
              onClick={() => {
                setError('')
                setAsked(true)
                setAsking(true)
              }}
              className={`ml-auto ${dangerButton}`}
            >
              Borrar
            </button>
          )}
        </div>
      )}
    </form>
  )
}
