import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router'
import VoteScreen from './VoteScreen'
import { UseCasesContext } from '../use-cases-context'

const vote = (matchId, id, name, over = {}) => ({
  matchId,
  player: { id, name, position: 'winger', photoUrl: null, shirtNumber: id },
  minutes: 30,
  goals: 0,
  assists: 0,
  goalsConceded: null,
  myScore: null,
  ...over,
})
const match = (matchId, label, pending, voted = []) => ({
  matchId,
  label,
  opponent: `Rival ${label}`,
  goalsFor: 4,
  goalsAgainst: 2,
  matchDate: new Date('2026-11-25T18:00:00Z'),
  votingClosesAt: new Date('2026-12-02T18:00:00Z'),
  pending,
  voted,
})

const J5 = match(
  1,
  'J5',
  [vote(1, 7, 'Tito', { goals: 2, assists: 1 }), vote(1, 9, 'Nano')],
  [vote(1, 4, 'Chema', { myScore: 6.5 })],
)
const COPA = match(2, 'Copa J2', [vote(2, 9, 'Nano')])

function setup(session = [J5], castVote = vi.fn().mockResolvedValue(undefined)) {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  const useCases = { getVoteSession: vi.fn().mockResolvedValue(session), castVote }
  const view = render(
    <UseCasesContext.Provider value={useCases}>
      <MemoryRouter>
        <VoteScreen />
      </MemoryRouter>
    </UseCasesContext.Provider>,
  )
  return { user, castVote, ...view }
}

const setScore = (value) => fireEvent.change(screen.getByLabelText('Tu nota'), { target: { value: String(value) } })

async function start(user) {
  await user.click(await screen.findByRole('button', { name: 'Empezar' }))
}

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
afterEach(() => vi.useRealTimers())

describe('VoteScreen', () => {
  it('sin nada pendiente, lo dice', async () => {
    setup([])
    expect(await screen.findByText('No tienes votaciones pendientes.')).toBeInTheDocument()
  })

  it('la portada dice qué partido es y a cuántos te faltan; «Empezar» enseña la primera tarjeta', async () => {
    const { user } = setup([J5, COPA])

    expect(await screen.findByRole('heading', { name: 'Vota a tus compañeros' })).toBeInTheDocument()
    expect(screen.getByText(/J5 · Springfield 4–2 Rival J5/)).toBeInTheDocument()
    expect(screen.getByText(/2 compañeros/)).toBeInTheDocument()
    expect(screen.getByText(/Después, Copa J2/)).toBeInTheDocument()

    await start(user)

    expect(screen.getByRole('heading', { name: 'Tito' })).toBeInTheDocument()
    expect(screen.getByText('1 de 2')).toBeInTheDocument()
    expect(screen.getByText('goles').previousSibling).toHaveTextContent('2')
  })

  it('empieza sin nota y sin nota no se vota', async () => {
    const { user, castVote } = setup()
    await start(user)

    expect(screen.getByLabelText('Tu nota')).toHaveAttribute('aria-valuetext', 'sin nota')
    await user.click(screen.getByRole('button', { name: 'Aceptar nota' }))

    expect(screen.getByRole('status')).toHaveTextContent('Elige una nota con la barra antes de votar.')
    expect(screen.getByRole('heading', { name: 'Tito' })).toBeInTheDocument()
    expect(castVote).not.toHaveBeenCalled()
  })

  it('al votar pasa a la siguiente, y la nota se envía a los 5 s, no antes', async () => {
    const { user, castVote } = setup()
    await start(user)

    setScore(7.5)
    expect(screen.getByLabelText('Tu nota')).toHaveAttribute('aria-valuetext', '7,5')
    await user.click(screen.getByRole('button', { name: 'Aceptar nota' }))

    expect(screen.getByRole('heading', { name: 'Nano' })).toBeInTheDocument()
    expect(screen.getByText((_, el) => el?.textContent === 'Votado 7,5 a Tito')).toBeInTheDocument()
    expect(screen.getByText('2 de 2')).toBeInTheDocument()

    await act(() => vi.advanceTimersByTime(4000))
    expect(castVote).not.toHaveBeenCalled()
    await act(() => vi.advanceTimersByTime(1000))
    expect(castVote).toHaveBeenCalledWith({ matchId: 1, playerId: 7, score: 7.5 })
  })

  it('la cuenta atrás empieza en 5 aunque lleves rato en la pantalla', async () => {
    const { user } = setup()
    await start(user)
    await act(() => vi.advanceTimersByTime(20000))

    setScore(8)
    await user.click(screen.getByRole('button', { name: 'Aceptar nota' }))

    expect(screen.getByRole('button', { name: 'Deshacer (5)' })).toBeInTheDocument()
    await act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByRole('button', { name: 'Deshacer (4)' })).toBeInTheDocument()
  })

  it('«Deshacer» dentro de los 5 s devuelve la tarjeta y no envía nada', async () => {
    const { user, castVote } = setup()
    await start(user)

    setScore(8)
    await user.click(screen.getByRole('button', { name: 'Aceptar nota' }))
    await user.click(screen.getByRole('button', { name: /Deshacer/ }))

    expect(screen.getByRole('heading', { name: 'Tito' })).toBeInTheDocument()
    await act(() => vi.advanceTimersByTime(6000))
    expect(castVote).not.toHaveBeenCalled()
  })

  it('si falla el envío, lo avisa y el compañero vuelve a la fila', async () => {
    const castVote = vi.fn().mockRejectedValue(new Error('La votación de este partido ya está cerrada.'))
    const { user } = setup([J5], castVote)
    await start(user)

    setScore(8)
    await user.click(screen.getByRole('button', { name: 'Aceptar nota' }))
    await act(() => vi.advanceTimersByTime(5000))

    expect(await screen.findByText('La votación de este partido ya está cerrada.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Nano' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Saltar por ahora' }))
    expect(screen.getByRole('heading', { name: 'Tito' })).toBeInTheDocument()
  })

  it('«Saltar por ahora» lo pasa al final; al último no se le puede saltar', async () => {
    const { user } = setup()
    await start(user)

    await user.click(screen.getByRole('button', { name: 'Saltar por ahora' }))
    expect(screen.getByRole('heading', { name: 'Nano' })).toBeInTheDocument()
    expect(screen.getByText('1 de 2')).toBeInTheDocument()

    setScore(6)
    await user.click(screen.getByRole('button', { name: 'Aceptar nota' }))
    await user.click(screen.getByRole('button', { name: 'Saltar por ahora' }))

    expect(screen.getByRole('status')).toHaveTextContent('Es el último que te falta: no se puede saltar.')
    expect(screen.getByRole('heading', { name: 'Tito' })).toBeInTheDocument()
  })

  it('al acabar un partido pasa al siguiente, y al acabar todos enseña tus notas', async () => {
    const { user } = setup([J5, COPA])
    await start(user)

    for (const score of [7, 8.5]) {
      setScore(score)
      await user.click(screen.getByRole('button', { name: 'Aceptar nota' }))
    }
    expect(screen.getByText(/Enviando tu última nota/)).toBeInTheDocument()
    await act(() => vi.advanceTimersByTime(5000))

    expect(await screen.findByRole('heading', { name: 'Siguiente partido' })).toBeInTheDocument()
    expect(screen.getByText(/Copa J2 · Springfield 4–2 Rival Copa J2/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Seguir votando' }))

    setScore(9)
    await user.click(screen.getByRole('button', { name: 'Aceptar nota' }))
    await act(() => vi.advanceTimersByTime(5000))

    expect(await screen.findByRole('heading', { name: 'Has votado a todos' })).toBeInTheDocument()
    expect(screen.getByText(/J5 · Rival J5 · medias el 2 dic/)).toBeInTheDocument()
    // Las de hoy y la que ya tenías de otro día (Chema, 6,5); solo las ves tú.
    for (const [name, score] of [
      ['Tito', '7'],
      ['Nano', '8,5'],
      ['Chema', '6,5'],
    ]) {
      expect(screen.getAllByText(name)[0].nextSibling).toHaveTextContent(score)
    }
    expect(screen.getByRole('link', { name: 'Volver a la plantilla' })).toHaveAttribute('href', '/')
  })

  it('cuando la base de datos confirma un voto, pide al marco que vuelva a contar los pendientes', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const refreshPendingVotes = vi.fn()
    const useCases = { getVoteSession: vi.fn().mockResolvedValue([J5]), castVote: vi.fn().mockResolvedValue(undefined) }
    render(
      <UseCasesContext.Provider value={useCases}>
        <MemoryRouter>
          <Routes>
            <Route element={<Outlet context={{ pendingVotes: 2, refreshPendingVotes }} />}>
              <Route index element={<VoteScreen />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </UseCasesContext.Provider>,
    )
    await start(user)

    setScore(7)
    await user.click(screen.getByRole('button', { name: 'Aceptar nota' }))
    expect(refreshPendingVotes).not.toHaveBeenCalled() // aún se puede deshacer
    await act(() => vi.advanceTimersByTime(5000))

    expect(refreshPendingVotes).toHaveBeenCalledTimes(1)
  })

  it('si sales durante la cuenta atrás, la nota se envía en ese momento', async () => {
    const { user, castVote, unmount } = setup()
    await start(user)

    setScore(7)
    await user.click(screen.getByRole('button', { name: 'Aceptar nota' }))
    unmount()

    expect(castVote).toHaveBeenCalledWith({ matchId: 1, playerId: 7, score: 7 })
  })
})
