import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MvpTiebreak from './MvpTiebreak'
import { UseCasesContext } from '../../use-cases-context'

const TIED = [
  { playerId: 3, name: 'Checo', rating: 8.33 },
  { playerId: 4, name: 'Navi', rating: 8.33 },
]

function renderTie({ chosenId = null, onDone = vi.fn(), ...overrides } = {}) {
  const useCases = {
    getMvpTie: vi.fn().mockResolvedValue(TIED),
    saveMvp: vi.fn().mockResolvedValue(),
    ...overrides,
  }
  render(
    <UseCasesContext.Provider value={useCases}>
      <MvpTiebreak matchId={5} seasonId={2} chosenId={chosenId} onDone={onDone} />
    </UseCasesContext.Provider>,
  )
  return { useCases, onDone }
}

describe('MvpTiebreak', () => {
  it('enseña solo a los empatados, con su media con coma', async () => {
    const { useCases } = renderTie()

    const tie = await screen.findByRole('region', { name: 'Empate de MVP' })
    expect(within(tie).getByText('Elige entre los que empatan. Puedes cambiarlo después.')).toBeInTheDocument()
    expect(
      within(tie)
        .getAllByRole('radio')
        .map((r) => r.closest('label').textContent),
    ).toEqual(['Checo8,3', 'Navi8,3'])
    expect(useCases.getMvpTie).toHaveBeenCalledWith({ matchId: 5, seasonId: 2 })
  })

  it('elige al MVP y avisa al terminar', async () => {
    const { useCases, onDone } = renderTie()

    await userEvent.click(await screen.findByRole('radio', { name: /Checo/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar MVP' }))

    expect(useCases.saveMvp).toHaveBeenCalledWith({ matchId: 5, playerId: 3 })
    expect(onDone).toHaveBeenCalledWith('MVP guardado: Checo.')
  })

  it('si ya se eligió, sale marcado y se puede cambiar', async () => {
    const { useCases } = renderTie({ chosenId: 4 })

    expect(await screen.findByRole('radio', { name: /Navi/ })).toBeChecked()
    await userEvent.click(screen.getByRole('radio', { name: /Checo/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar MVP' }))

    expect(useCases.saveMvp).toHaveBeenCalledWith({ matchId: 5, playerId: 3 })
  })

  it('sin elegir, explica que hay que elegir (lo valida el caso de uso)', async () => {
    renderTie({ saveMvp: vi.fn().mockRejectedValue(new Error('Elige quién es el MVP.')) })

    await userEvent.click(await screen.findByRole('button', { name: 'Guardar MVP' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Elige quién es el MVP.')
  })

  it('lo que rechace la base de datos se explica', async () => {
    renderTie({
      saveMvp: vi.fn().mockRejectedValue(new Error('El MVP tiene que ser uno de los jugadores con la mejor media.')),
    })

    await userEvent.click(await screen.findByRole('radio', { name: /Checo/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar MVP' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('El MVP tiene que ser uno de los jugadores')
  })

  it('sin empate (o con la votación abierta), no aparece', async () => {
    const { useCases } = renderTie({ getMvpTie: vi.fn().mockResolvedValue([]) })

    await vi.waitFor(() => expect(useCases.getMvpTie).toHaveBeenCalled())
    expect(screen.queryByRole('region', { name: 'Empate de MVP' })).not.toBeInTheDocument()
  })
})
