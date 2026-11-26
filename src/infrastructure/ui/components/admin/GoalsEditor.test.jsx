import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GoalsEditor from './GoalsEditor'
import { UseCasesContext } from '../../use-cases-context'

const PLAYERS = [
  { playerId: 3, name: 'Checo' },
  { playerId: 4, name: 'Navi' },
  { playerId: 6, name: 'Dani' },
]
const SHEET = {
  players: PLAYERS,
  goals: [
    { id: 1, scorerId: 4, scorer: 'Navi', detail: 'Asistencia de Checo' },
    { id: 2, scorerId: 3, scorer: 'Checo', detail: 'Penalti' },
  ],
  missedPenalties: [],
}

function renderGoals({ goalsFor = 4, ...overrides } = {}) {
  const useCases = {
    getMatchGoals: vi.fn().mockResolvedValue(SHEET),
    addGoal: vi.fn().mockResolvedValue(),
    deleteGoal: vi.fn().mockResolvedValue(),
    addMissedPenalty: vi.fn().mockResolvedValue(),
    deleteMissedPenalty: vi.fn().mockResolvedValue(),
    ...overrides,
  }
  render(
    <UseCasesContext.Provider value={useCases}>
      <GoalsEditor matchId={6} seasonId={2} goalsFor={goalsFor} />
    </UseCasesContext.Provider>,
  )
  return useCases
}

describe('GoalsEditor', () => {
  it('lista los goles con su detalle y cuenta cuántos tienen goleador', async () => {
    const useCases = renderGoals()

    const goals = await screen.findByRole('region', { name: 'Goles' })
    expect(within(goals).getByText('2 de 4 con goleador')).toBeInTheDocument()
    expect(
      within(goals)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual([expect.stringMatching(/^Navi.*Asistencia de Checo/), expect.stringMatching(/^Checo.*Penalti/)])
    expect(useCases.getMatchGoals).toHaveBeenCalledWith({ matchId: 6, seasonId: 2 })
  })

  it('el marcador manda: avisa de los que faltan, sin bloquear', async () => {
    renderGoals({ goalsFor: 3 })

    expect(
      await screen.findByText('Falta 1 gol por asignar. Si fue en propia puerta del rival, déjalo así.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ Gol' })).toBeInTheDocument()
  })

  it('con todos los goles apuntados, no ofrece añadir más', async () => {
    renderGoals({ goalsFor: 2 })

    expect(await screen.findByText('Todos los goles a favor tienen goleador.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '+ Gol' })).not.toBeInTheDocument()
  })

  it('apunta un gol normal con dos toques: quién marcó y quién asistió', async () => {
    const useCases = renderGoals()

    await userEvent.click(await screen.findByRole('button', { name: '+ Gol' }))
    await userEvent.click(
      within(screen.getByRole('group', { name: '¿Quién marcó?' })).getByRole('button', { name: 'Dani' }),
    )
    await userEvent.click(
      within(screen.getByRole('group', { name: '¿Asistencia?' })).getByRole('button', { name: 'Checo' }),
    )

    expect(useCases.addGoal).toHaveBeenCalledWith({ matchId: 6, scorerId: 6, assistId: 3, type: 'regular' })
    expect(await within(screen.getByRole('region', { name: 'Goles' })).findByRole('status')).toHaveTextContent(
      'Gol añadido.',
    )
    expect(useCases.getMatchGoals).toHaveBeenCalledTimes(2)
    // Guardado, el panel se cierra.
    expect(screen.queryByRole('group', { name: '¿Quién marcó?' })).not.toBeInTheDocument()
  })

  it('«Sin asistencia» guarda el gol sin asistente', async () => {
    const useCases = renderGoals()

    await userEvent.click(await screen.findByRole('button', { name: '+ Gol' }))
    await userEvent.click(
      within(screen.getByRole('group', { name: '¿Quién marcó?' })).getByRole('button', { name: 'Dani' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Sin asistencia' }))

    expect(useCases.addGoal).toHaveBeenCalledWith({ matchId: 6, scorerId: 6, assistId: null, type: 'regular' })
  })

  it('el goleador queda marcado y no sale como asistente', async () => {
    renderGoals()

    await userEvent.click(await screen.findByRole('button', { name: '+ Gol' }))
    const scorers = screen.getByRole('group', { name: '¿Quién marcó?' })
    await userEvent.click(within(scorers).getByRole('button', { name: 'Dani' }))

    expect(within(scorers).getByRole('button', { name: 'Dani' })).toHaveAttribute('aria-pressed', 'true')
    expect(
      within(screen.getByRole('group', { name: '¿Asistencia?' })).queryByRole('button', { name: 'Dani' }),
    ).not.toBeInTheDocument()
    expect(
      within(screen.getByRole('group', { name: '¿Cómo?' })).getByRole('button', { name: 'Normal' }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('un penalti se guarda al tocarlo, sin asistencia', async () => {
    const useCases = renderGoals()

    await userEvent.click(await screen.findByRole('button', { name: '+ Gol' }))
    await userEvent.click(
      within(screen.getByRole('group', { name: '¿Quién marcó?' })).getByRole('button', { name: 'Dani' }),
    )
    await userEvent.click(
      within(screen.getByRole('group', { name: '¿Cómo?' })).getByRole('button', { name: 'Doble penalti' }),
    )

    expect(useCases.addGoal).toHaveBeenCalledWith({ matchId: 6, scorerId: 6, assistId: null, type: 'double_penalty' })
  })

  it('«Cancelar» cierra sin apuntar nada', async () => {
    const useCases = renderGoals()

    await userEvent.click(await screen.findByRole('button', { name: '+ Gol' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('group', { name: '¿Quién marcó?' })).not.toBeInTheDocument()
    expect(useCases.addGoal).not.toHaveBeenCalled()
  })

  it('lo que rechace la base de datos (más goles que el resultado) se explica, y el panel sigue abierto', async () => {
    renderGoals({
      addGoal: vi.fn().mockRejectedValue(new Error('Habría 5 goles registrados y el partido tiene 4 a favor.')),
    })

    await userEvent.click(await screen.findByRole('button', { name: '+ Gol' }))
    await userEvent.click(
      within(screen.getByRole('group', { name: '¿Quién marcó?' })).getByRole('button', { name: 'Dani' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Sin asistencia' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Habría 5 goles registrados')
    expect(screen.getByRole('group', { name: '¿Quién marcó?' })).toBeInTheDocument()
  })

  it('borra un gol con confirmación', async () => {
    const useCases = renderGoals()

    await userEvent.click(await screen.findByRole('button', { name: 'Borrar el gol de Navi' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sí, borrar' }))

    expect(useCases.deleteGoal).toHaveBeenCalledWith(1)
    expect(await within(screen.getByRole('region', { name: 'Goles' })).findByRole('status')).toHaveTextContent(
      'Gol borrado.',
    )
  })

  it('sin resultado, explica que hay que ponerlo antes', async () => {
    renderGoals({ goalsFor: null })

    expect(
      await screen.findByText('Pon el resultado en «Datos del partido» para apuntar los goles.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '+ Gol' })).not.toBeInTheDocument()
  })

  it('si nadie tiene minutos, pide guardar antes la convocatoria', async () => {
    renderGoals({ getMatchGoals: vi.fn().mockResolvedValue({ players: [], goals: [], missedPenalties: [] }) })

    expect(
      await screen.findByText('Nadie tiene minutos todavía: guarda antes la convocatoria con sus minutos.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '+ Gol' })).not.toBeInTheDocument()
  })

  it('apunta un penalti fallado con dos toques y lo lista; sin ninguno, lo dice', async () => {
    const useCases = renderGoals()

    const missed = await screen.findByRole('region', { name: 'Penaltis fallados' })
    expect(within(missed).getByText('Ninguno.')).toBeInTheDocument()
    await userEvent.click(within(missed).getByRole('button', { name: '+ Penalti fallado' }))
    await userEvent.click(
      within(within(missed).getByRole('group', { name: '¿Quién lo falló?' })).getByRole('button', { name: 'Navi' }),
    )
    await userEvent.click(
      within(within(missed).getByRole('group', { name: '¿De qué tipo?' })).getByRole('button', {
        name: 'Doble penalti',
      }),
    )

    expect(useCases.addMissedPenalty).toHaveBeenCalledWith({ matchId: 6, playerId: 4, type: 'double_penalty' })
    // El aviso sale en su sección, no bajo «Goles».
    expect(await within(missed).findByRole('status')).toHaveTextContent('Penalti fallado añadido.')
    expect(within(screen.getByRole('region', { name: 'Goles' })).getByRole('status')).toBeEmptyDOMElement()
  })

  it('borra un penalti fallado con confirmación', async () => {
    const useCases = renderGoals({
      getMatchGoals: vi.fn().mockResolvedValue({
        ...SHEET,
        missedPenalties: [{ id: 9, player: 'Navi', detail: 'Doble penalti' }],
      }),
    })

    await userEvent.click(await screen.findByRole('button', { name: 'Borrar el penalti fallado de Navi' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sí, borrar' }))

    expect(useCases.deleteMissedPenalty).toHaveBeenCalledWith(9)
  })

  it('si no se puede cargar, lo dice y deja reintentar', async () => {
    renderGoals({
      getMatchGoals: vi
        .fn()
        .mockRejectedValueOnce(new Error('No se pudieron cargar los goles.'))
        .mockResolvedValue(SHEET),
    })

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar los goles.')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('2 de 4 con goleador')).toBeInTheDocument()
  })
})
