import { afterEach, describe, expect, it, vi } from 'vitest'
import { squarePhoto } from './image'

// Navegador falso: createImageBitmap da una foto del tamaño pedido y el canvas «codifica» en los tipos de `supported`.
function setup({ width, height, supported = ['image/webp', 'image/jpeg'] }) {
  const bitmap = { width, height, close: vi.fn() }
  const drawImage = vi.fn()
  const canvases = []
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap))
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () {
    canvases.push(this)
    return { drawImage }
  })
  // Como Safari antiguo: un tipo que no sabe codificar lo devuelve en png.
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((done, type) =>
    done(new Blob(['x'], { type: supported.includes(type) ? type : 'image/png' })),
  )
  return { bitmap, drawImage, canvases }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const file = new File(['foto'], 'IMG_0001.jpg', { type: 'image/jpeg' })

describe('squarePhoto', () => {
  it('recorta el centro de una foto horizontal y la deja en 512 × 512, en webp', async () => {
    const { bitmap, drawImage, canvases } = setup({ width: 4000, height: 3000 })

    const photo = await squarePhoto(file)

    expect(createImageBitmap).toHaveBeenCalledWith(file)
    expect(drawImage).toHaveBeenCalledWith(bitmap, 500, 0, 3000, 3000, 0, 0, 512, 512)
    expect([canvases[0].width, canvases[0].height]).toEqual([512, 512])
    expect(photo.blob.type).toBe('image/webp')
    expect(photo.extension).toBe('webp')
    expect(bitmap.close).toHaveBeenCalled()
  })

  it('en una foto vertical recorta arriba y abajo', async () => {
    const { bitmap, drawImage } = setup({ width: 3000, height: 4000 })

    await squarePhoto(file)

    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 500, 3000, 3000, 0, 0, 512, 512)
  })

  it('si el navegador no sabe webp, la guarda en jpeg', async () => {
    setup({ width: 800, height: 800, supported: ['image/jpeg'] })

    const photo = await squarePhoto(file)

    expect(photo.blob.type).toBe('image/jpeg')
    expect(photo.extension).toBe('jpg')
  })

  it('si no puede leer la imagen (un HEIC, por ejemplo), lo explica', async () => {
    setup({ width: 1, height: 1 })
    createImageBitmap.mockRejectedValue(new DOMException('The source image could not be decoded.'))

    await expect(squarePhoto(file)).rejects.toThrow('No se pudo leer esa imagen. Prueba con una foto JPG o PNG.')
  })
})

it('si falla al dibujar, libera igual la foto decodificada', async () => {
  const { bitmap, drawImage } = setup({ width: 800, height: 800 })
  drawImage.mockImplementation(() => {
    throw new Error('sin memoria')
  })

  await expect(squarePhoto(file)).rejects.toThrow('sin memoria')
  expect(bitmap.close).toHaveBeenCalled()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
