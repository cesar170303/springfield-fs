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

/** El domingo próximo, en hora local (hoy, si hoy es domingo): el equipo suele jugar los domingos. */
export function nextSunday(now = new Date()) {
  const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  sunday.setDate(sunday.getDate() + ((7 - sunday.getDay()) % 7))
  return sunday
}

/** «22 nov 18:30», en hora local. */
export const formatDateTime = (date) => `${formatShortDate(date)} ${toLocalTime(date)}`

const STATE_TEXT = {
  upcoming: 'Por jugar',
  unfinished: 'Por terminar',
  closed: 'Votación cerrada',
  mvpTie: 'Empate de MVP',
}

/** Estado de matchState en palabras: «Por jugar», «Votación abierta hasta el 29 nov»… */
export const matchStateText = (state) =>
  state.key === 'voting' ? `Votación abierta hasta el ${formatShortDate(state.closesAt)}` : STATE_TEXT[state.key]

/** Resultado «4–2», o una raya si aún no hay. */
export const scoreText = ({ goalsFor, goalsAgainst }) => (goalsFor === null ? '–' : `${goalsFor}–${goalsAgainst}`)

/** Aviso de goles a favor sin goleador (el marcador manda: avisa, no bloquea). */
export const missingGoalsText = (n) =>
  `${n === 1 ? 'Falta 1 gol' : `Faltan ${n} goles`} por asignar. Si fue en propia puerta del rival, déjalo así.`
