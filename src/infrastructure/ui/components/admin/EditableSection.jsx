import { primaryButton } from './styles'

/** Sección con una lista que se edita en el sitio: título, botón de crear y avisos. `editor` es lo que da useEditor. */
export default function EditableSection({ title, newLabel, editor: { open, newButton, result }, loadError, children }) {
  const error = result.error || loadError?.message
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="type-title">{title}</h2>
        <button ref={newButton} type="button" onClick={() => open('new')} className={primaryButton}>
          {newLabel}
        </button>
      </div>
      {error && (
        <p role="alert" className="type-small text-danger">
          {error}
        </p>
      )}
      <p role="status" className="type-small text-text-muted empty:sr-only">
        {result.ok}
      </p>
      {children}
    </section>
  )
}
