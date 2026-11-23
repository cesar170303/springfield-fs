import { Route, Routes } from 'react-router'
import NotFound from '../NotFound'
import AdminHome from './AdminHome'
import SeasonsPage from './SeasonsPage'

/** Pantallas del panel de admin, dentro de /admin. App solo las monta para el staff. */
export default function AdminRoutes() {
  return (
    <Routes>
      <Route index element={<AdminHome />} />
      <Route path="temporadas" element={<SeasonsPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
