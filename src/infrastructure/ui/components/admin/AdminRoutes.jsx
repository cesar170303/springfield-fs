import { Route, Routes } from 'react-router'
import NotFound from '../NotFound'
import AdminHome from './AdminHome'
import PlayerForm from './PlayerForm'
import PlayersAdmin from './PlayersAdmin'
import RosterAdmin from './RosterAdmin'
import SeasonsPage from './SeasonsPage'
import VotersAdmin from './VotersAdmin'

/** Pantallas del panel de admin, dentro de /admin. App solo las monta para el staff. */
export default function AdminRoutes() {
  return (
    <Routes>
      <Route index element={<AdminHome />} />
      <Route path="temporadas" element={<SeasonsPage />} />
      <Route path="jugadores" element={<PlayersAdmin />} />
      <Route path="jugadores/nuevo" element={<PlayerForm />} />
      <Route path="jugadores/:playerId" element={<PlayerForm />} />
      <Route path="plantilla" element={<RosterAdmin />} />
      <Route path="votantes" element={<VotersAdmin />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
