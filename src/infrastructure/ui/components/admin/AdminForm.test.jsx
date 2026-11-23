import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminForm from './AdminForm'

const QUESTION = '¿Borrar 2025/26? No se puede deshacer.'

function renderForm(props = {}) {
  const handlers = { onSubmit: vi.fn().mockResolvedValue(), onCancel: vi.fn(), onDelete: vi.fn().mockResolvedValue() }
  render(
    <AdminForm {...handlers} deleteQuestion={QUESTION} {...props}>
      <label>
        Nombre
        <input defaultValue="2025/26" />
      </label>
    </AdminForm>,
  )
  return handlers
}

const button = (name) => screen.getByRole('button', { name })

describe('AdminForm: borrar', () => {
  it('sin onDelete (al crear) no hay botón de borrar', () => {
    renderForm({ onDelete: undefined })

    expect(screen.queryByRole('button', { name: 'Borrar' })).not.toBeInTheDocument()
  })

  it('pide confirmación antes de borrar, con el foco en la opción segura', async () => {
    const { onDelete } = renderForm()

    await userEvent.click(button('Borrar'))

    expect(screen.getByText(QUESTION)).toBeInTheDocument()
    expect(button('No borrar')).toHaveFocus()
    expect(onDelete).not.toHaveBeenCalled()

    await userEvent.click(button('Sí, borrar'))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('«No borrar» vuelve a los botones de antes, con el foco en «Borrar»', async () => {
    const { onDelete } = renderForm()

    await userEvent.click(button('Borrar'))
    await userEvent.click(button('No borrar'))

    expect(screen.queryByText(QUESTION)).not.toBeInTheDocument()
    expect(button('Borrar')).toHaveFocus()
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('mientras pregunta, pulsar Intro en un campo no guarda', async () => {
    const { onSubmit } = renderForm()

    await userEvent.click(button('Borrar'))
    await userEvent.type(screen.getByLabelText('Nombre'), '{Enter}')

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('si no se puede borrar, enseña la frase y el formulario sigue abierto', async () => {
    renderForm({ onDelete: vi.fn().mockRejectedValue(new Error('No se puede borrar: ya tiene partidos.')) })

    await userEvent.click(button('Borrar'))
    await userEvent.click(button('Sí, borrar'))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se puede borrar: ya tiene partidos.')
    expect(button('Guardar')).toBeEnabled()
    expect(button('Borrar')).toHaveFocus()
  })

  it('mientras borra, no se puede pedir dos veces', async () => {
    const onDelete = vi.fn(() => new Promise(() => {}))
    renderForm({ onDelete })

    await userEvent.click(button('Borrar'))
    await userEvent.click(button('Sí, borrar'))

    expect(button('Sí, borrar')).toBeDisabled()
    expect(onDelete).toHaveBeenCalledTimes(1)
  })
})
