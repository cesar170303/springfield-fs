import { useState } from 'react'
import { primaryButton, secondaryButton } from './styles'

/** Formulario del panel. Si `onSubmit` falla, enseña la frase del error y sigue abierto con lo escrito. */
export default function AdminForm({ onSubmit, onCancel, children }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSubmit()
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-lg bg-surface p-4">
      {children}
      {error && (
        <p role="alert" className="type-small text-danger">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className={primaryButton}>
          Guardar
        </button>
        <button type="button" onClick={onCancel} className={secondaryButton}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
