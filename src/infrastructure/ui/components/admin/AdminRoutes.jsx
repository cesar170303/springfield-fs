import { Route, Routes } from 'react-router'
import NotFound from '../NotFound'
import AdminHome from './AdminHome'
import PlayerForm from './PlayerForm'
import PlayersAdmin from './PlayersAdmin'
import SeasonsPage from './SeasonsPage'

/** Pantallas del panel de admin, dentro de /admin. App solo las monta para el staff. */
export default function AdminRoutes() {
  return (
    <Routes>
      <Route index element={<AdminHome />} />
      <Route path="temporadas" element={<SeasonsPage />} />
      <Route path="jugadores" element={<PlayersAdmin />} />
      <Route path="jugadores/nuevo" element={<PlayerForm />} />
      <Route path="jugadores/:playerId" element={<PlayerForm />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
