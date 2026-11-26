import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SquadEditor from './SquadEditor'
import { UseCasesContext } from '../../use-cases-context'

const row = (playerId, name, shirtNumber, extra = {}) => ({
  playerId,
  name,
  shirtNumber,
  called: false,
  minutes: 0,
  yellow: false,
  red: false,
  canLeave: true,
  ...extra,
})
const SQUAD = [
  row(3, 'Checo', 7, { called: true, minutes: 30, yellow: true, canLeave: false }),
  row(4, 'Navi', 9, { called: true, minutes: 20 }),
  row(5, 'Javi', 10),
]

function renderSquad(overrides = {}, onSaved = vi.fn()) {
  const useCases = {
    getMatchSquad: vi.fn().mockResolvedValue(SQUAD),
    saveMatchSquad: vi.fn().mockResolvedValue(),
    ...overrides,
  }
  render(
    <UseCasesContext.Provider value={useCases}>
      <SquadEditor matchId={6} seasonId={2} onSaved={onSaved} />
    </UseCasesContext.Provider>,
  )
  return useCases
}

describe('SquadEditor', () => {
  it('enseña la plantilla con quién está convocado, sus minutos y sus tarjetas', async () => {
    const useCases = renderSquad()

    expect(await screen.findByRole('checkbox', { name: 'Checo' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Javi' })).not.toBeChecked()
    expect(screen.getByText('2 de 3')).toBeInTheDocument()
    expect(screen.getByLabelText('Minutos de Checo')).toHaveValue(30)
    expect(screen.getByRole('button', { name: 'Amarilla a Checo' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Roja a Checo' })).toHaveAttribute('aria-pressed', 'false')
    // Sin convocar no hay minutos ni tarjetas que poner.
    expect(screen.queryByLabelText('Minutos de Javi')).not.toBeInTheDocument()
    expect(useCases.getMatchSquad).toHaveBeenCalledWith({ matchId: 6, seasonId: 2 })
  })

  it('convoca, pone minutos y tarjetas, guarda la convocatoria entera y avisa de que está guardada', async () => {
    const onSaved = vi.fn()
    const useCases = renderSquad({}, onSaved)

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Javi' }))
    await userEvent.type(screen.getByLabelText('Minutos de Javi'), '15')
    await userEvent.click(screen.getByRole('button', { name: 'Roja a Javi' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Navi' }))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar convocatoria' }))

    expect(useCases.saveMatchSquad).toHaveBeenCalledWith({
      matchId: 6,
      squad: [
        { playerId: 3, called: true, minutes: '30', yellow: true, red: false },
        { playerId: 4, called: false, minutes: '20', yellow: false, red: false },
        { playerId: 5, called: true, minutes: '15', yellow: false, red: true },
      ],
    })
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalledOnce())
  })

  it('«Guardar convocatoria» es el botón principal (azul)', async () => {
    renderSquad()

    expect(await screen.findByRole('button', { name: 'Guardar convocatoria' })).toHaveClass('bg-accent')
  })

  it('no deja quitar a quien tiene goles o penaltis apuntados, y explica por qué', async () => {
    renderSquad()

    const checo = await screen.findByRole('checkbox', { name: 'Checo' })
    await userEvent.click(checo)

    expect(checo).toBeChecked()
    expect(checo).toHaveAttribute('aria-disabled', 'true')
    expect(
      within(checo.closest('li')).getByText('Tiene goles o penaltis: bórralos antes de quitarle.'),
    ).toBeInTheDocument()
  })

  it('si la base de datos lo rechaza, lo explica, no avisa de guardado y la lista vuelve a lo que hay guardado', async () => {
    const onSaved = vi.fn()
    const useCases = renderSquad({
      saveMatchSquad: vi
        .fn()
        .mockRejectedValue(new Error('Navi ya tiene votos en este partido: no se puede quitar de la convocatoria.')),
    })

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Navi' }))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar convocatoria' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Navi ya tiene votos en este partido')
    expect(useCases.getMatchSquad).toHaveBeenCalledTimes(2)
    expect(await screen.findByRole('checkbox', { name: 'Navi' })).toBeChecked()
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('mientras guarda, no se puede volver a pulsar ni se pierde el foco', async () => {
    const useCases = renderSquad({ saveMatchSquad: vi.fn(() => new Promise(() => {})) })

    const save = await screen.findByRole('button', { name: 'Guardar convocatoria' })
    await userEvent.click(save)
    await userEvent.click(save)

    expect(save).toHaveAttribute('aria-disabled', 'true')
    expect(save).toHaveFocus()
    expect(useCases.saveMatchSquad).toHaveBeenCalledOnce()
  })

  it('con la plantilla vacía, explica dónde se añaden jugadores', async () => {
    renderSquad({ getMatchSquad: vi.fn().mockResolvedValue([]) })

    expect(
      await screen.findByText('La plantilla de esta temporada está vacía: añade jugadores en «Plantilla y dorsales».'),
    ).toBeInTheDocument()
  })

  it('si no se puede cargar, lo dice y deja reintentar', async () => {
    renderSquad({
      getMatchSquad: vi
        .fn()
        .mockRejectedValueOnce(new Error('No se pudo cargar la convocatoria.'))
        .mockResolvedValue(SQUAD),
    })

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar la convocatoria.')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('checkbox', { name: 'Checo' })).toBeInTheDocument()
  })
})
