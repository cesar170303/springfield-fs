// Gesto de la tarjeta de votación (docs/SPEC.md §6): a la derecha vota, a la izquierda salta.

/** Fracción del ancho de la tarjeta que hay que arrastrar para que cuente. */
export const SWIPE_THRESHOLD = 0.3

/** Al soltar: 'vote', 'skip' o null (la tarjeta vuelve a su sitio). */
export function swipeDecision(dx, width) {
  if (dx > width * SWIPE_THRESHOLD) return 'vote'
  if (dx < -width * SWIPE_THRESHOLD) return 'skip'
  return null
}

/** Cuánto se ve el sello mientras se arrastra: de -1 (saltar) a 1 (votar), lleno al llegar al umbral. */
export const swipeProgress = (dx, width) => Math.max(-1, Math.min(1, dx / (width * SWIPE_THRESHOLD)))
