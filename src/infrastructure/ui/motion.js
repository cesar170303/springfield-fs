// Punto único de GSAP para la UI (ADR-0003): los componentes importan de aquí, no de 'gsap' ni de '@gsap/react'.
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'
import { formatStat } from './format'

// ScrollTrigger (la ficha avanza con el scroll) y SplitText (titulares letra a letra): se registran con la ficha,
// la primera pantalla que los usa.
gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText)

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

/**
 * Cifras que ruedan desde 0 hasta su valor (docs/SPEC.md §11). Cada elemento lleva su valor en `data-count` y, si
 * tiene decimales, `data-decimals`. React ya pinta el valor final: la animación acaba en el mismo texto.
 * Llamar dentro de `useMotion`.
 */
export function countUp(elements) {
  for (const el of elements) {
    const decimals = Number(el.dataset.decimals) || 0
    gsap.fromTo(
      el,
      { innerText: 0 },
      {
        innerText: Number(el.dataset.count),
        duration: 0.9,
        ease: 'power3.out',
        modifiers: { innerText: (v) => formatStat(Number(v), decimals) },
      },
    )
  }
}

export { gsap, ScrollTrigger, SplitText }
