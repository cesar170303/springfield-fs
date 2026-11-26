import { useState } from 'react'
import { primaryButton, secondaryButton } from './styles'

/**
 * Botón que pregunta en el sitio antes de actuar (docs/SPEC.md §12): «¿Seguro? Sí, archivar · Cancelar», sin ventanas
 * emergentes. Si `onConfirm` falla, enseña la frase del error.
 */
export default function ConfirmButton({ label, question, confirmLabel, onConfirm, className = secondaryButton }) {
  const [asking, setAsking] = useState(false)
  const [asked, setAsked] = useState(false) // al volver de la pregunta, el foco va al botón
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function back() {
    setAsking(false)
    setAsked(true)
  }

  async function confirm() {
    setBusy(true)
    try {
      await onConfirm()
    } catch (e) {
      setError(e.message)
    }
    setBusy(false)
    back()
  }

  if (asking) {
    return (
      <div className="flex flex-col gap-3 rounded-lg bg-surface p-4">
        <p className="type-body">{question}</p>
        <div className="flex gap-2">
          <button type="button" disabled={busy} onClick={confirm} className={`flex-1 ${primaryButton}`}>
            {confirmLabel}
          </button>
          <button type="button" autoFocus disabled={busy} onClick={back} className={`flex-1 ${secondaryButton}`}>
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        autoFocus={asked}
        onClick={() => {
          setError('')
          setAsking(true)
        }}
        className={className}
      >
        {label}
      </button>
      {error && (
        <p role="alert" className="type-small text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
