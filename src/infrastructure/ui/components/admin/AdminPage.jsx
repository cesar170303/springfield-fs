import { Link, useLocation } from 'react-router'

const PANEL = { to: '/admin', label: 'Panel', name: 'Volver al panel' }

/**
 * Marco de las pantallas del panel: volver atrás (al inicio, si no se dice otra cosa en `back`), con la temporada
 * elegida; título y, al lado, `action`.
 */
export default function AdminPage({ title, action, back = PANEL, children }) {
  const { search } = useLocation()
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-6">
      <Link
        to={{ pathname: back.to, search }}
        aria-label={back.name}
        className="flex min-h-11 items-center self-start type-small text-accent-text"
      >
        ‹ {back.label}
      </Link>
      {/* Si el botón no cabe al lado y baja de línea, que no quede pegado al título. */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-5">
        <h1 className="type-display">{title}</h1>
        {action}
      </div>
      {children}
    </main>
  )
}
