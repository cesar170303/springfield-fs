import { Route, Routes } from 'react-router'
import NotFound from '../NotFound'
import AdminHome from './AdminHome'
import MatchEditor from './MatchEditor'
import MatchesAdmin from './MatchesAdmin'
import MatchNew from './MatchNew'
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
      <Route path="partidos" element={<MatchesAdmin />} />
      <Route path="partidos/nuevo" element={<MatchNew />} />
      <Route path="partidos/:matchId" element={<MatchEditor />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
