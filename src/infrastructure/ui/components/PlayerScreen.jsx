import { Link, useLocation } from 'react-router'

/** Ficha del jugador (docs/SPEC.md §10, paso 4). Por ahora solo el esqueleto: el diseño está pendiente de aprobar. */
export default function PlayerScreen() {
  const { search } = useLocation()
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6">
      <Link to={{ pathname: '/', search }} aria-label="Volver a la plantilla" className="type-small text-accent-text">
        ‹ Plantilla
      </Link>
      <h1 className="type-display">Ficha del jugador</h1>
      <p className="text-text-muted">Muy pronto, aquí sus estadísticas y su valoración.</p>
    </main>
  )
}
