import { describe, expect, it } from 'vitest'
import {
  formatDateTime,
  fromLocalParts,
  matchStateText,
  nextSunday,
  scoreText,
  timeOptions,
  toLocalDay,
  toLocalTime,
} from './match-format'

// Fechas construidas en hora local: los tests valen en cualquier zona horaria.
const local = new Date(2026, 10, 22, 18, 30)

describe('fecha y hora del partido', () => {
  it('separa una fecha en día y hora locales, para los campos del formulario', () => {
    expect(toLocalDay(local)).toBe('2026-11-22')
    expect(toLocalTime(local)).toBe('18:30')
    expect(toLocalTime(new Date(2026, 0, 5, 9, 5))).toBe('09:05')
  })

  it('y junta día y hora en una fecha local', () => {
    expect(fromLocalParts('2026-11-22', '18:30')).toEqual(local)
  })

  it('sin día no hay fecha válida', () => {
    expect(Number.isNaN(fromLocalParts('', '18:30').getTime())).toBe(true)
  })

  it('las horas se eligen cada 15 minutos, de 09:00 a 23:45', () => {
    const options = timeOptions()
    expect(options[0]).toBe('09:00')
    expect(options[1]).toBe('09:15')
    expect(options.at(-1)).toBe('23:45')
    expect(options).toHaveLength(60)
  })

  it('si el partido ya tiene una hora fuera de la lista, también se ofrece, en su sitio', () => {
    const options = timeOptions('18:40')
    expect(options.slice(options.indexOf('18:30'), options.indexOf('18:30') + 3)).toEqual(['18:30', '18:40', '18:45'])
  })

  it('el próximo domingo (hoy, si hoy es domingo)', () => {
    expect(toLocalDay(nextSunday(new Date(2026, 10, 26, 12)))).toBe('2026-11-29') // jueves
    expect(toLocalDay(nextSunday(new Date(2026, 10, 29, 9)))).toBe('2026-11-29') // domingo
    expect(toLocalDay(nextSunday(new Date(2026, 10, 30, 9)))).toBe('2026-12-06') // lunes
  })

  it('la escribe como «22 nov 18:30»', () => {
    expect(formatDateTime(local)).toBe('22 nov 18:30')
  })
})

describe('matchStateText', () => {
  it('describe cada estado del partido', () => {
    expect(matchStateText({ key: 'upcoming' })).toBe('Por jugar')
    expect(matchStateText({ key: 'unfinished' })).toBe('Por terminar')
    expect(matchStateText({ key: 'voting', closesAt: new Date(2026, 10, 29, 18, 30) })).toBe(
      'Votación abierta hasta el 29 nov',
    )
    expect(matchStateText({ key: 'closed' })).toBe('Votación cerrada')
  })
})

it('el resultado, «4–2», o una raya si aún no hay', () => {
  expect(scoreText({ goalsFor: 4, goalsAgainst: 2 })).toBe('4–2')
  expect(scoreText({ goalsFor: null, goalsAgainst: null })).toBe('–')
})
