import { Route, Routes } from 'react-router'
import { isSuperadmin } from '../../../../domain/user'
import NotFound from '../NotFound'
import AccountsAdmin from './AccountsAdmin'
import AdminHome from './AdminHome'
import MatchEditor from './MatchEditor'
import MatchesAdmin from './MatchesAdmin'
import MatchNew from './MatchNew'
import PlayerForm from './PlayerForm'
import PlayersAdmin from './PlayersAdmin'
import RosterAdmin from './RosterAdmin'
import SeasonsPage from './SeasonsPage'
import VotersAdmin from './VotersAdmin'

/**
 * Pantallas del panel de admin, dentro de /admin. App solo las monta para el staff y le pasa el rol y la cuenta:
 * «Usuarios» solo existe para el superadmin (a los demás, «Esta página no existe»).
 */
export default function AdminRoutes({ role, userId }) {
  const superadmin = isSuperadmin(role)
  return (
    <Routes>
      <Route index element={<AdminHome superadmin={superadmin} />} />
      {superadmin && <Route path="usuarios" element={<AccountsAdmin currentUserId={userId} />} />}
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
