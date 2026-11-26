import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import VotersAdmin from './VotersAdmin'
import { UseCasesContext } from '../../use-cases-context'

const FILTERS = {
  seasons: [
    { id: 2, name: '2026/27', isCurrent: true },
    { id: 1, name: '2025/26', isCurrent: false },
  ],
  competitions: [],
  initialSeasonId: 2,
}
const VOTERS = [
  { id: 'u-1', name: 'Ana Ejemplo', email: 'ana@example.com', votes: false },
  { id: 'u-3', name: 'Benito Ejemplo', email: 'benito@example.com', votes: true },
]

function renderVoters(overrides = {}) {
  const useCases = {
    getSquadFilters: vi.fn().mockResolvedValue(FILTERS),
    getSeasonVoters: vi.fn().mockResolvedValue(VOTERS),
    setSeasonVoter: vi.fn().mockResolvedValue(),
    ...overrides,
  }
  render(
    <UseCasesContext.Provider value={useCases}>
      <MemoryRouter initialEntries={['/admin/votantes?temporada=2']}>
        <VotersAdmin />
      </MemoryRouter>
    </UseCasesContext.Provider>,
  )
  return useCases
}

describe('VotersAdmin', () => {
  it('lista los viewers con su correo y si votan en la temporada elegida', async () => {
    const useCases = renderVoters()

    expect(await screen.findByRole('switch', { name: 'Ana Ejemplo vota en 2026/27' })).not.toBeChecked()
    expect(screen.getByRole('switch', { name: 'Benito Ejemplo vota en 2026/27' })).toBeChecked()
    expect(screen.getByText('ana@example.com')).toBeInTheDocument()
    expect(screen.getByText(/La plantilla vota siempre/)).toBeInTheDocument()
    expect(useCases.getSeasonVoters).toHaveBeenCalledWith(2)
  })

  it('al marcar a un viewer, vota esta temporada; lo anuncia y recarga', async () => {
    const useCases = renderVoters()

    await userEvent.click(await screen.findByRole('switch', { name: 'Ana Ejemplo vota en 2026/27' }))

    expect(useCases.setSeasonVoter).toHaveBeenCalledWith({ seasonId: 2, userId: 'u-1', votes: true })
    expect(await screen.findByRole('status')).toHaveTextContent('Ana Ejemplo vota en 2026/27.')
    expect(useCases.getSeasonVoters).toHaveBeenCalledTimes(2)
  })

  it('al desmarcarlo, deja de votar', async () => {
    const useCases = renderVoters()

    await userEvent.click(await screen.findByRole('switch', { name: 'Benito Ejemplo vota en 2026/27' }))

    expect(useCases.setSeasonVoter).toHaveBeenCalledWith({ seasonId: 2, userId: 'u-3', votes: false })
    expect(await screen.findByRole('status')).toHaveTextContent('Benito Ejemplo ya no vota en 2026/27.')
  })

  it('mientras guarda, el interruptor no se puede volver a pulsar', async () => {
    const useCases = renderVoters({ setSeasonVoter: vi.fn(() => new Promise(() => {})) })

    const toggle = await screen.findByRole('switch', { name: 'Ana Ejemplo vota en 2026/27' })
    await userEvent.click(toggle)
    await userEvent.click(toggle)

    // aria-disabled y no disabled: un control desactivado pierde el foco y el teclado volvería al principio.
    expect(toggle).toHaveAttribute('aria-disabled', 'true')
    expect(toggle).toHaveFocus()
    expect(useCases.setSeasonVoter).toHaveBeenCalledOnce()
  })

  it('con el teclado, el foco sigue en el interruptor después de guardar', async () => {
    renderVoters()

    const toggle = await screen.findByRole('switch', { name: 'Ana Ejemplo vota en 2026/27' })
    toggle.focus()
    await userEvent.keyboard(' ')

    expect(await screen.findByRole('status')).toHaveTextContent('Ana Ejemplo vota en 2026/27.')
    expect(screen.getByRole('switch', { name: 'Ana Ejemplo vota en 2026/27' })).toHaveFocus()
  })

  it('si no se puede guardar, lo explica y el interruptor sigue como estaba', async () => {
    renderVoters({ setSeasonVoter: vi.fn().mockRejectedValue(new Error('No se pudo guardar el votante.')) })

    const toggle = await screen.findByRole('switch', { name: 'Ana Ejemplo vota en 2026/27' })
    await userEvent.click(toggle)

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo guardar el votante.')
    expect(toggle).not.toBeChecked()
  })

  it('sin viewers, explica de dónde salen', async () => {
    renderVoters({ getSeasonVoters: vi.fn().mockResolvedValue([]) })

    expect(
      await screen.findByText(
        'Aún no hay ningún viewer. Las cuentas que no son de la plantilla aparecen aquí al registrarse.',
      ),
    ).toBeInTheDocument()
  })

  it('si no se puede cargar, lo dice y deja reintentar', async () => {
    renderVoters({
      getSeasonVoters: vi
        .fn()
        .mockRejectedValueOnce(new Error('No se pudieron cargar los votantes.'))
        .mockResolvedValue(VOTERS),
    })

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar los votantes.')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('switch', { name: 'Ana Ejemplo vota en 2026/27' })).toBeInTheDocument()
  })
})
