import { Link, useLocation } from 'react-router'

/** Enlace a la ficha de un jugador que conserva los filtros de la URL actual (temporada y competición). */
export default function PlayerLink({ id, className = '', children }) {
  const { search } = useLocation()
  return (
    <Link to={{ pathname: `/jugador/${id}`, search }} className={`hover:underline ${className}`}>
      {children}
    </Link>
  )
}
