import { NavLink } from 'react-router'
import Icon from './Icon'

// Secciones de la barra. Se irán añadiendo Votar y Rankings.
const ITEMS = [
  { to: '/', label: 'Plantilla', icon: 'grid', end: true },
  { to: '/admin', label: 'Admin', icon: 'admin', staffOnly: true },
]

/**
 * Barra de navegación flotante, en píldora de cristal (ADR-0004).
 * En el móvil solo la sección actual lleva texto; el resto, icono con su nombre accesible. Desde md, todas con texto.
 */
export default function BottomNav({ staff = false }) {
  return (
    <nav
      aria-label="Principal"
      className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-10 flex -translate-x-1/2 gap-1 rounded-full border border-text/15 bg-surface/60 p-1.5 shadow-2xl backdrop-blur-md"
    >
      {ITEMS.filter((item) => staff || !item.staffOnly).map(({ to, label, icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full type-small font-semibold whitespace-nowrap transition ${isActive ? 'bg-text px-4 text-bg' : 'px-3 text-text hover:bg-text/10 md:px-4'}`
          }
        >
          {({ isActive }) => (
            <>
              <Icon name={icon} />
              <span className={isActive ? undefined : 'sr-only md:not-sr-only'}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
