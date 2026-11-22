import { NavLink } from 'react-router'

const item = 'flex min-h-11 items-center gap-2 rounded-full px-4 type-small font-semibold whitespace-nowrap transition'
const icon = {
  'aria-hidden': true,
  className: 'size-4 shrink-0',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

/** Barra de navegación flotante, en píldora de cristal (ADR-0004). Crecerá con Votar, Rankings y Admin. */
export default function BottomNav({ onSignOut }) {
  return (
    <nav
      aria-label="Principal"
      className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-10 flex -translate-x-1/2 gap-1 rounded-full border border-text/15 bg-surface/60 p-1.5 shadow-2xl backdrop-blur-md"
    >
      <NavLink
        to="/"
        end
        className={({ isActive }) => `${item} ${isActive ? 'bg-text text-bg' : 'text-text hover:bg-text/10'}`}
      >
        <svg {...icon}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
        Plantilla
      </NavLink>
      <button type="button" onClick={onSignOut} className={`${item} text-text hover:bg-text/10`}>
        <svg {...icon}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="m16 17 5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
        Salir
      </button>
    </nav>
  )
}
