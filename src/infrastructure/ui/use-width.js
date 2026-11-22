import { useEffect, useState } from 'react'

/**
 * Ancho real de un elemento, que se actualiza cuando cambia de tamaño (para dibujar el SVG a su medida).
 * Devuelve [ref, ancho]: la ref es una función, así funciona aunque el elemento aparezca más tarde.
 * Sin ResizeObserver (los tests, en jsdom) se queda en `fallback`.
 */
export function useWidth(fallback) {
  const [element, setElement] = useState(null)
  const [width, setWidth] = useState(fallback)

  useEffect(() => {
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width) || fallback))
    observer.observe(element)
    return () => observer.disconnect()
  }, [element, fallback])

  return [setElement, width]
}
