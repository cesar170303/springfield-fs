import { secondaryButton } from './styles'

/** Fallo al cargar, con la forma de volver a intentarlo. */
export default function LoadError({ message, onRetry }) {
  return (
    <div className="flex flex-col items-start gap-2">
      <p role="alert" className="type-small text-danger">
        {message}
      </p>
      <button type="button" onClick={onRetry} className={secondaryButton}>
        Reintentar
      </button>
    </div>
  )
}
