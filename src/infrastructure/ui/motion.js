// Punto único de GSAP para la UI (ADR-0003): los componentes importan de aquí, no de 'gsap' ni de '@gsap/react'.
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)

/**
 * Crea las animaciones de un componente solo si el dispositivo no pide reducir movimiento (docs/SPEC.md §11).
 * Con «reducir movimiento» no se crea ninguna y todo se queda en su estado final, el que pinta el CSS.
 * Se limpian solas al desmontar: useGSAP revierte su contexto y, con él, este matchMedia.
 * @param {() => void} animate crea las animaciones (gsap.to, gsap.from…)
 * @param {import('react').RefObject<Element>} [scope] contenedor del que no salen los selectores de `animate`
 */
export function useMotion(animate, scope) {
  useGSAP(
    () => {
      gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', animate, scope)
    },
    { scope },
  )
}

export { gsap }
