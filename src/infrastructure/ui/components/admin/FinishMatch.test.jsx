import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FinishMatch from './FinishMatch'
import { UseCasesContext } from '../../use-cases-context'

// «Ahora» es el 26 nov a mediodía (hora local).
beforeEach(() => vi.useFakeTimers({ now: new Date(2026, 10, 26, 12, 0), toFake: ['Date'] }))
afterEach(() => vi.useRealTimers())

const PLAYED = { id: 6, date: new Date(2026, 10, 25, 18, 30), goalsFor: 4, isFinished: false }
const GOALS = {
  players: [
    { playerId: 3, name: 'Checo' },
    { playerId: 4, name: 'Navi' },
  ],
  goals: [{ id: 1 }, { id: 2 }, { id: 3 }],
  missedPenalties: [],
}

function renderFinish({ match = PLAYED, onDone = vi.fn(), ...overrides } = {}) {
  const useCases = {
    getMatchGoals: vi.fn().mockResolvedValue(GOALS),
    finishMatch: vi.fn().mockResolvedValue(),
    reopenMatch: vi.fn().mockResolvedValue(),
    ...overrides,
  }
  render(
    <UseCasesContext.Provider value={useCases}>
      <FinishMatch match={match} seasonId={2} onDone={onDone} />
    </UseCasesContext.Provider>,
  )
  return { useCases, onDone }
}

describe('FinishMatch', () => {
  it('jugado, con resultado y minutos: avisa de los goles que faltan y hasta cuándo se podrá votar', async () => {
    renderFinish()

    const section = await screen.findByRole('region', { name: 'Terminar partido' })
    expect(
      within(section).getByText('Falta 1 gol por asignar. Si fue en propia puerta del rival, déjalo así.'),
    ).toBeInTheDocument()
    expect(within(section).getByText('La votación estará abierta hasta el 2 dic 18:30.')).toBeInTheDocument()
    expect(within(section).getByRole('button', { name: 'Terminar y abrir la votación' })).toBeInTheDocument()
  })

  it('termina con confirmación y avisa de que está terminado', async () => {
    const { useCases, onDone } = renderFinish()

    await userEvent.click(await screen.findByRole('button', { name: 'Terminar y abrir la votación' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sí, terminar' }))

    expect(useCases.finishMatch).toHaveBeenCalledWith(6)
    expect(onDone).toHaveBeenCalledWith('Partido terminado. La votación está abierta hasta el 2 dic 18:30.')
  })

  it('si ya pasaron 7 días, dice que no habrá votación', async () => {
    const { onDone } = renderFinish({ match: { ...PLAYED, date: new Date(2026, 10, 15, 18, 30) } })

    expect(await screen.findByText('Ya no habrá votación: pasaron más de 7 días desde el partido.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Terminar partido' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sí, terminar' }))
    expect(onDone).toHaveBeenCalledWith('Partido terminado.')
  })

  it('explica lo que falta y no deja terminar', async () => {
    renderFinish({
      match: { ...PLAYED, date: new Date(2026, 10, 29, 18, 30), goalsFor: null },
      getMatchGoals: vi.fn().mockResolvedValue({ players: [], goals: [], missedPenalties: [] }),
    })

    const section = await screen.findByRole('region', { name: 'Terminar partido' })
    expect(
      within(section)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual([
      'Falta el resultado (en «Datos del partido»).',
      'El partido aún no se ha jugado.',
      'Nadie tiene minutos: guarda la convocatoria con los minutos de cada uno.',
    ])
    expect(within(section).queryByRole('button', { name: /Terminar/ })).not.toBeInTheDocument()
  })

  it('si la base de datos no deja terminarlo, lo explica', async () => {
    renderFinish({
      finishMatch: vi.fn().mockRejectedValue(new Error('Un partido terminado no puede tener una fecha futura.')),
    })

    await userEvent.click(await screen.findByRole('button', { name: 'Terminar y abrir la votación' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sí, terminar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Un partido terminado no puede tener una fecha futura.')
  })

  it('terminado: se puede reabrir con confirmación', async () => {
    const { useCases, onDone } = renderFinish({ match: { ...PLAYED, isFinished: true } })

    const section = await screen.findByRole('region', { name: 'Partido terminado' })
    await userEvent.click(within(section).getByRole('button', { name: 'Reabrir partido' }))
    expect(
      screen.getByText(
        '¿Reabrir el partido? Se cierra la votación y sus cifras salen de la plantilla. Solo se puede si nadie ha votado.',
      ),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sí, reabrir' }))

    expect(useCases.reopenMatch).toHaveBeenCalledWith(6)
    expect(onDone).toHaveBeenCalledWith('Partido reabierto.')
  })

  it('reabrir con votos lo impide la base de datos, y se explica', async () => {
    renderFinish({
      match: { ...PLAYED, isFinished: true },
      reopenMatch: vi.fn().mockRejectedValue(new Error('No se puede reabrir un partido que ya tiene votos.')),
    })

    await userEvent.click(await screen.findByRole('button', { name: 'Reabrir partido' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sí, reabrir' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se puede reabrir un partido que ya tiene votos.')
  })
})
