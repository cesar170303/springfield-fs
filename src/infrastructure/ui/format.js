// Formato de las cifras en pantalla, en español: la valoración con un decimal y coma (8,3).
const oneDecimal = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

const shortDate = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' })

/** Fecha corta, en español: «29 nov». */
export const formatShortDate = (date) => shortDate.format(date).replace('.', '')

/** Una cifra: con un decimal si `decimals` es 1, entera si es 0. Sin valor (null), una raya. */
export function formatStat(value, decimals = 0) {
  if (value === null) return '–'
  return decimals ? oneDecimal.format(value) : String(Math.round(value))
}
