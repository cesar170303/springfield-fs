import { expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import App from './App'
import { AuthContext } from './auth/auth-context'

// Aparte de App.test.jsx: aquí la descarga del panel falla, como sin red o tras un despliegue nuevo.
vi.mock('./components/admin/AdminRoutes', () => {
  throw new Error('sin red')
})

it('si el panel no se puede descargar, lo dice y la barra sigue en su sitio', async () => {
  render(
    <AuthContext.Provider value={{ user: { email: 'staff@example.com' }, role: 'admin', loading: false }}>
      <MemoryRouter initialEntries={['/admin']}>
        <App />
      </MemoryRouter>
    </AuthContext.Provider>,
  )

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'No se pudo cargar el panel. Comprueba la conexión y recarga la página.',
  )
  expect(screen.getByRole('navigation', { name: 'Principal' })).toBeInTheDocument()
})
