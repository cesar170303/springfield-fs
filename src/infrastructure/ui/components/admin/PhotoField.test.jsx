import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PhotoField from './PhotoField'
import { UseCasesContext } from '../../use-cases-context'

const CHECO = {
  id: 3,
  nickname: 'Checo',
  firstName: 'Sergio',
  photoPath: 'players/3-1.webp',
  photoUrl: 'https://cdn.test/3-1.webp',
}
const PHOTO = { blob: new Blob(['x'], { type: 'image/webp' }), extension: 'webp' }
const file = new File(['foto'], 'IMG_0001.jpg', { type: 'image/jpeg' })

beforeEach(() => {
  vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:vista-previa'), revokeObjectURL: vi.fn() })
})
afterEach(() => vi.unstubAllGlobals())

function renderField({ player = CHECO, prepare = vi.fn().mockResolvedValue(PHOTO), ...overrides } = {}) {
  const useCases = { changePhoto: vi.fn().mockResolvedValue(), removePhoto: vi.fn().mockResolvedValue(), ...overrides }
  const onChanged = vi.fn()
  render(
    <UseCasesContext.Provider value={useCases}>
      <PhotoField player={player} onChanged={onChanged} prepare={prepare} />
    </UseCasesContext.Provider>,
  )
  return { useCases, onChanged, prepare }
}

describe('PhotoField', () => {
  it('enseña la foto actual', () => {
    renderField()

    expect(screen.getByRole('img', { name: 'Foto de Checo' })).toHaveAttribute('src', 'https://cdn.test/3-1.webp')
  })

  it('sin foto, lo dice y ofrece ponerla', () => {
    renderField({ player: { ...CHECO, photoPath: null, photoUrl: null } })

    expect(screen.getByText('Sin foto')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Poner foto' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Quitar foto' })).not.toBeInTheDocument()
  })

  it('al elegir una foto, la enseña ya recortada y no la sube hasta confirmar', async () => {
    const { useCases, prepare } = renderField()

    await userEvent.upload(screen.getByLabelText('Elegir foto'), file)

    expect(prepare).toHaveBeenCalledWith(file)
    expect(await screen.findByRole('img', { name: 'Vista previa de la foto nueva' })).toHaveAttribute(
      'src',
      'blob:vista-previa',
    )
    expect(useCases.changePhoto).not.toHaveBeenCalled()
  })

  it('al usarla, la sube, lo anuncia y recarga la ficha', async () => {
    const { useCases, onChanged } = renderField()

    await userEvent.upload(screen.getByLabelText('Elegir foto'), file)
    await userEvent.click(await screen.findByRole('button', { name: 'Usar esta foto' }))

    expect(useCases.changePhoto).toHaveBeenCalledWith(CHECO, PHOTO)
    expect(await screen.findByRole('status')).toHaveTextContent('Foto guardada.')
    expect(onChanged).toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:vista-previa')
  })

  it('cancelar la vista previa deja la foto como estaba', async () => {
    const { useCases } = renderField()

    await userEvent.upload(screen.getByLabelText('Elegir foto'), file)
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar' }))

    expect(screen.getByRole('img', { name: 'Foto de Checo' })).toBeInTheDocument()
    expect(useCases.changePhoto).not.toHaveBeenCalled()
  })

  it('si la imagen no se puede leer, lo explica', async () => {
    renderField({
      prepare: vi.fn().mockRejectedValue(new Error('No se pudo leer esa imagen. Prueba con una foto JPG o PNG.')),
    })

    await userEvent.upload(screen.getByLabelText('Elegir foto'), file)

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo leer esa imagen.')
  })

  it('si no se puede subir, lo explica y deja la vista previa para reintentar', async () => {
    renderField({ changePhoto: vi.fn().mockRejectedValue(new Error('No se pudo subir la foto. Inténtalo de nuevo.')) })

    await userEvent.upload(screen.getByLabelText('Elegir foto'), file)
    await userEvent.click(await screen.findByRole('button', { name: 'Usar esta foto' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo subir la foto.')
    expect(screen.getByRole('button', { name: 'Usar esta foto' })).toBeEnabled()
  })

  it('quita la foto con confirmación', async () => {
    const { useCases, onChanged } = renderField()

    await userEvent.click(screen.getByRole('button', { name: 'Quitar foto' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sí, quitar' }))

    expect(useCases.removePhoto).toHaveBeenCalledWith(CHECO)
    expect(await screen.findByRole('status')).toHaveTextContent('Foto quitada.')
    expect(onChanged).toHaveBeenCalled()
  })
})

it('si no se puede quitar, lo explica una sola vez', async () => {
  vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(), revokeObjectURL: vi.fn() })
  renderField({ removePhoto: vi.fn().mockRejectedValue(new Error('No se pudo quitar la foto.')) })

  await userEvent.click(screen.getByRole('button', { name: 'Quitar foto' }))
  await userEvent.click(screen.getByRole('button', { name: 'Sí, quitar' }))

  expect(await screen.findAllByRole('alert')).toHaveLength(1)
  expect(screen.getByRole('alert')).toHaveTextContent('No se pudo quitar la foto.')
})
