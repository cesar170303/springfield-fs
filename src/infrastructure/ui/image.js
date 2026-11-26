const SIZE = 512
const QUALITY = 0.85

const encode = (canvas, type) => new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY))

/**
 * Foto de un jugador lista para subir (docs/SPEC.md §12): el centro recortado en cuadrado, a 512 × 512, en webp o, si
 * el navegador no sabe codificar webp, en jpeg. createImageBitmap ya gira la foto según su EXIF (las del móvil).
 * @param {Blob} file
 * @returns {Promise<{ blob: Blob, extension: 'webp' | 'jpg' }>}
 */
export async function squarePhoto(file) {
  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('No se pudo leer esa imagen. Prueba con una foto JPG o PNG.')
  }
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  canvas
    .getContext('2d')
    .drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE)
  bitmap.close()

  // Un navegador que no sabe webp devuelve otro tipo (png): entonces, jpeg.
  const webp = await encode(canvas, 'image/webp')
  if (webp?.type === 'image/webp') return { blob: webp, extension: 'webp' }
  return { blob: await encode(canvas, 'image/jpeg'), extension: 'jpg' }
}
