import { Link } from 'react-router'

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6">
      <h1 className="type-display">Esta página no existe</h1>
      <Link to="/" className="type-small text-accent-text underline">
        Ir a la plantilla
      </Link>
    </main>
  )
}
