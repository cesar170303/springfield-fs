import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConfirmButton from './ConfirmButton'

function renderButton(onConfirm = vi.fn().mockResolvedValue()) {
  render(
    <ConfirmButton
      label="Archivar"
      question="¿Archivar a NAVI? Conserva su historial."
      confirmLabel="Sí, archivar"
      onConfirm={onConfirm}
    />,
  )
  return onConfirm
}

describe('ConfirmButton', () => {
  it('pregunta en el sitio antes de hacerlo, con el foco en «Cancelar»', async () => {
    const onConfirm = renderButton()

    await userEvent.click(screen.getByRole('button', { name: 'Archivar' }))

    expect(screen.getByText('¿Archivar a NAVI? Conserva su historial.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('al confirmar, lo hace', async () => {
    const onConfirm = renderButton()

    await userEvent.click(screen.getByRole('button', { name: 'Archivar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sí, archivar' }))

    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('al cancelar, no hace nada y el foco vuelve al botón', async () => {
    const onConfirm = renderButton()

    await userEvent.click(screen.getByRole('button', { name: 'Archivar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByText('¿Archivar a NAVI? Conserva su historial.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Archivar' })).toHaveFocus()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('mientras trabaja, no deja pulsar otra vez', async () => {
    const onConfirm = renderButton(vi.fn(() => new Promise(() => {})))

    await userEvent.click(screen.getByRole('button', { name: 'Archivar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sí, archivar' }))

    expect(screen.getByRole('button', { name: 'Sí, archivar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('si falla, lo explica y vuelve al botón', async () => {
    renderButton(vi.fn().mockRejectedValue(new Error('No se pudo archivar la ficha.')))

    await userEvent.click(screen.getByRole('button', { name: 'Archivar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sí, archivar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo archivar la ficha.')
    expect(screen.getByRole('button', { name: 'Archivar' })).toHaveFocus()
  })
})
