import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SeasonsAdmin from './SeasonsAdmin'
import { UseCasesContext } from '../../use-cases-context'

const SEASONS = [
  { id: 2, name: '2026/27', startDate: '2026-09-01', endDate: '2027-06-30', isCurrent: true },
  { id: 1, name: '2025/26', startDate: '2025-09-01', endDate: '2026-06-30', isCurrent: false },
]

function renderScreen(overrides = {}) {
  const useCases = {
    listSeasons: vi.fn().mockResolvedValue(SEASONS),
    saveSeason: vi.fn().mockResolvedValue(),
    setCurrentSeason: vi.fn().mockResolvedValue(),
    ...overrides,
  }
  render(
    <UseCasesContext.Provider value={useCases}>
      <SeasonsAdmin />
    </UseCasesContext.Provider>,
  )
  return useCases
}

const row = async (name) => (await screen.findByText(name)).closest('li')

async function fillForm({ name, startDate, endDate }) {
  for (const [label, value] of [
    ['Nombre', name],
    ['Inicio', startDate],
    ['Fin', endDate],
  ]) {
    const field = screen.getByLabelText(label)
    await userEvent.clear(field)
    if (value) await userEvent.type(field, value)
  }
  await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
}

describe('SeasonsAdmin', () => {
  it('lista las temporadas con sus fechas y dice cuál es la actual', async () => {
    renderScreen()

    const current = await row('2026/27')
    expect(current).toHaveTextContent('1 sept 2026 – 30 jun 2027')
    expect(within(current).getByText('Actual')).toBeInTheDocument()
    expect(within(current).queryByRole('button', { name: 'Marcar 2026/27 como actual' })).not.toBeInTheDocument()
    expect(within(await row('2025/26')).queryByText('Actual')).not.toBeInTheDocument()
  })

  it('crea una temporada, lo confirma y vuelve a cargar la lista', async () => {
    const useCases = renderScreen()

    await userEvent.click(await screen.findByRole('button', { name: 'Nueva temporada' }))
    await fillForm({ name: '2027/28', startDate: '2027-09-01', endDate: '2028-06-30' })

    expect(useCases.saveSeason).toHaveBeenCalledWith({
      name: '2027/28',
      startDate: '2027-09-01',
      endDate: '2028-06-30',
    })
    expect(await screen.findByRole('status')).toHaveTextContent('Temporada guardada.')
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()
    expect(useCases.listSeasons).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('button', { name: 'Nueva temporada' })).toHaveFocus()
  })

  it('edita una temporada con sus datos ya puestos', async () => {
    const useCases = renderScreen()

    await userEvent.click(within(await row('2025/26')).getByRole('button', { name: 'Editar 2025/26' }))
    expect(screen.getByLabelText('Nombre')).toHaveValue('2025/26')
    expect(screen.getByLabelText('Inicio')).toHaveValue('2025-09-01')
    await fillForm({ name: '2025-26', startDate: '2025-09-01', endDate: '2026-06-30' })

    expect(useCases.saveSeason).toHaveBeenCalledWith({
      id: 1,
      name: '2025-26',
      startDate: '2025-09-01',
      endDate: '2026-06-30',
    })
  })

  it('si no se puede guardar, enseña la frase y no pierde lo escrito', async () => {
    renderScreen({ saveSeason: vi.fn().mockRejectedValue(new Error('Ya hay una temporada con ese nombre.')) })

    await userEvent.click(await screen.findByRole('button', { name: 'Nueva temporada' }))
    await fillForm({ name: '2026/27', startDate: '2026-09-01', endDate: '2027-06-30' })

    expect(await screen.findByRole('alert')).toHaveTextContent('Ya hay una temporada con ese nombre.')
    expect(screen.getByLabelText('Nombre')).toHaveValue('2026/27')
  })

  it('sin fechas no se envía', async () => {
    const useCases = renderScreen()

    await userEvent.click(await screen.findByRole('button', { name: 'Nueva temporada' }))
    await fillForm({ name: '2027/28' })

    expect(useCases.saveSeason).not.toHaveBeenCalled()
  })

  it('mientras guarda, no se puede enviar dos veces', async () => {
    const useCases = renderScreen({ saveSeason: vi.fn(() => new Promise(() => {})) })

    await userEvent.click(await screen.findByRole('button', { name: 'Nueva temporada' }))
    await fillForm({ name: '2027/28', startDate: '2027-09-01', endDate: '2028-06-30' })
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(useCases.saveSeason).toHaveBeenCalledTimes(1)
  })

  it('cancelar cierra el formulario sin guardar', async () => {
    const useCases = renderScreen()

    await userEvent.click(await screen.findByRole('button', { name: 'Nueva temporada' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()
    expect(useCases.saveSeason).not.toHaveBeenCalled()
  })

  it('marca otra temporada como actual y recarga', async () => {
    const useCases = renderScreen()

    await userEvent.click(await screen.findByRole('button', { name: 'Marcar 2025/26 como actual' }))

    expect(useCases.setCurrentSeason).toHaveBeenCalledWith(1)
    expect(await screen.findByRole('status')).toHaveTextContent('2025/26 es la temporada actual.')
    expect(screen.getByRole('button', { name: 'Nueva temporada' })).toHaveFocus() // el botón pulsado va a desaparecer
    expect(useCases.listSeasons).toHaveBeenCalledTimes(2)
  })

  it('si no se puede marcar, lo dice y recarga para enseñar el estado real', async () => {
    const useCases = renderScreen({ setCurrentSeason: vi.fn().mockRejectedValue(new Error('No se pudo.')) })

    await userEvent.click(await screen.findByRole('button', { name: 'Marcar 2025/26 como actual' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo.')
    await waitFor(() => expect(useCases.listSeasons).toHaveBeenCalledTimes(2))
  })

  it('sin temporadas, invita a crear la primera', async () => {
    renderScreen({ listSeasons: vi.fn().mockResolvedValue([]) })

    expect(await screen.findByText('Aún no hay ninguna temporada. Crea la primera.')).toBeInTheDocument()
  })

  it('si no se pueden cargar, lo dice', async () => {
    renderScreen({ listSeasons: vi.fn().mockRejectedValue(new Error('No se pudieron cargar las temporadas.')) })

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar las temporadas.')
  })
})
