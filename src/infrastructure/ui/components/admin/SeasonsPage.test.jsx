import { expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import SeasonsPage from './SeasonsPage'
import { UseCasesContext } from '../../use-cases-context'

it('reúne temporadas y competiciones, y vuelve al inicio del panel con la temporada elegida', async () => {
  const useCases = {
    listSeasons: vi.fn().mockResolvedValue([]),
    listCompetitions: vi.fn().mockResolvedValue([]),
  }
  render(
    <UseCasesContext.Provider value={useCases}>
      <MemoryRouter initialEntries={['/admin/temporadas?temporada=2']}>
        <SeasonsPage />
      </MemoryRouter>
    </UseCasesContext.Provider>,
  )

  expect(await screen.findByRole('region', { name: 'Temporadas' })).toBeInTheDocument()
  expect(screen.getByRole('region', { name: 'Competiciones' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Volver al panel' })).toHaveAttribute('href', '/admin?temporada=2')
  expect(await screen.findByText('Aún no hay ninguna temporada. Crea la primera.')).toBeInTheDocument()
})
