import AdminPage from './AdminPage'
import CompetitionsAdmin from './CompetitionsAdmin'
import SeasonsAdmin from './SeasonsAdmin'

export default function SeasonsPage() {
  return (
    <AdminPage title="Temporadas y competiciones">
      <SeasonsAdmin />
      <CompetitionsAdmin />
    </AdminPage>
  )
}
