import { formatShortDate } from './format'

const pad = (n) => String(n).padStart(2, '0')

/** Día local de una fecha, como lo usa un <input type="date">: '2026-11-22'. */
export const toLocalDay = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

/** Hora local de una fecha: '18:30'. */
export const toLocalTime = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`

/** Día y hora locales → fecha. Sin zona, JavaScript lee '2026-11-22T18:30' en hora local; sin día, fecha inválida. */
export const fromLocalParts = (day, time) => new Date(day ? `${day}T${time}` : NaN)

// Horas que se ofrecen: cada 15 minutos, de 09:00 a 23:45.
const TIMES = Array.from({ length: 60 }, (_, i) => `${pad(9 + Math.floor(i / 4))}:${pad((i % 4) * 15)}`)

/** Horas para elegir. Si `current` (la del partido) no está en la lista, se añade en su sitio. */
export const timeOptions = (current) => (!current || TIMES.includes(current) ? TIMES : [...TIMES, current].sort())

/** El sábado próximo, en hora local (hoy, si hoy es sábado). */
export function nextSaturday(now = new Date()) {
  const saturday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  saturday.setDate(saturday.getDate() + ((6 - saturday.getDay() + 7) % 7))
  return saturday
}

/** «22 nov 18:30», en hora local. */
export const formatDateTime = (date) => `${formatShortDate(date)} ${toLocalTime(date)}`

const STATE_TEXT = { upcoming: 'Por jugar', unfinished: 'Por terminar', closed: 'Votación cerrada' }

/** Estado de matchState en palabras: «Por jugar», «Votación abierta hasta el 29 nov»… */
export const matchStateText = (state) =>
  state.key === 'voting' ? `Votación abierta hasta el ${formatShortDate(state.closesAt)}` : STATE_TEXT[state.key]

/** Resultado «4–2», o una raya si aún no hay. */
export const scoreText = ({ goalsFor, goalsAgainst }) => (goalsFor === null ? '–' : `${goalsFor}–${goalsAgainst}`)
