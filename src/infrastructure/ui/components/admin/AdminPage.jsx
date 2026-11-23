import { Link, useLocation } from 'react-router'

/** Marco de las pantallas del panel: volver al inicio (con la temporada elegida) y título. */
export default function AdminPage({ title, children }) {
  const { search } = useLocation()
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-6">
      <Link
        to={{ pathname: '/admin', search }}
        aria-label="Volver al panel"
        className="flex min-h-11 items-center self-start type-small text-accent-text"
      >
        ‹ Panel
      </Link>
      <h1 className="type-display">{title}</h1>
      {children}
    </main>
  )
}
