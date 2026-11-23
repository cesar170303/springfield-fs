import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CompetitionsAdmin from './CompetitionsAdmin'
import { UseCasesContext } from '../../use-cases-context'

const COMPETITIONS = [
  { id: 1, name: 'Primera División', type: 'league' },
  { id: 2, name: 'Copa local', type: 'cup' },
]

function renderSection(overrides = {}) {
  const useCases = {
    listCompetitions: vi.fn().mockResolvedValue(COMPETITIONS),
    saveCompetition: vi.fn().mockResolvedValue(),
    ...overrides,
  }
  render(
    <UseCasesContext.Provider value={useCases}>
      <CompetitionsAdmin />
    </UseCasesContext.Provider>,
  )
  return useCases
}

describe('CompetitionsAdmin', () => {
  it('lista las competiciones con su tipo', async () => {
    renderSection()

    expect((await screen.findByText('Primera División')).closest('li')).toHaveTextContent('Liga')
    expect(screen.getByText('Copa local').closest('li')).toHaveTextContent('Copa')
  })

  it('crea una competición, lo confirma y vuelve a cargar la lista', async () => {
    const useCases = renderSection()

    await userEvent.click(await screen.findByRole('button', { name: 'Nueva competición' }))
    await userEvent.type(screen.getByLabelText('Nombre'), 'Amistosos')
    await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'Amistoso')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(useCases.saveCompetition).toHaveBeenCalledWith({ name: 'Amistosos', type: 'friendly' })
    expect(screen.getByRole('status')).toHaveTextContent('Competición guardada.')
    expect(useCases.listCompetitions).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('button', { name: 'Nueva competición' })).toHaveFocus()
  })

  it('edita una competición con sus datos ya puestos', async () => {
    const useCases = renderSection()

    await userEvent.click(await screen.findByRole('button', { name: 'Editar Copa local' }))
    expect(screen.getByLabelText('Tipo')).toHaveValue('cup')
    await userEvent.clear(screen.getByLabelText('Nombre'))
    await userEvent.type(screen.getByLabelText('Nombre'), 'Copa')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(useCases.saveCompetition).toHaveBeenCalledWith({ id: 2, name: 'Copa', type: 'cup' })
  })

  it('un nombre repetido se explica y no se pierde lo escrito', async () => {
    renderSection({ saveCompetition: vi.fn().mockRejectedValue(new Error('Ya hay una competición con ese nombre.')) })

    await userEvent.click(await screen.findByRole('button', { name: 'Nueva competición' }))
    await userEvent.type(screen.getByLabelText('Nombre'), 'Copa local')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Ya hay una competición con ese nombre.')
    expect(screen.getByLabelText('Nombre')).toHaveValue('Copa local')
  })

  it('sin competiciones, invita a crear la primera', async () => {
    renderSection({ listCompetitions: vi.fn().mockResolvedValue([]) })

    expect(await screen.findByText('Aún no hay ninguna competición. Crea la primera.')).toBeInTheDocument()
  })

  it('si no se pueden cargar, lo dice', async () => {
    renderSection({ listCompetitions: vi.fn().mockRejectedValue(new Error('No se pudieron cargar.')) })

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar.')
  })
})
