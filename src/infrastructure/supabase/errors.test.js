import { describe, expect, it } from 'vitest'
import { readableError } from './errors'

const FALLBACK = 'No se pudo guardar. Inténtalo de nuevo.'
const message = (error) => readableError(error, FALLBACK).message

describe('readableError', () => {
  it('las frases de los triggers se enseñan tal cual', () => {
    expect(message({ code: 'P0001', message: 'No se puede borrar un partido que ya tiene votos' })).toBe(
      'No se puede borrar un partido que ya tiene votos.',
    )
  })

  it('explica cada restricción por su nombre', () => {
    const duplicate = 'duplicate key value violates unique constraint "seasons_name_key"'
    const badRange = 'new row for relation "seasons" violates check constraint "seasons_check"'

    expect(message({ code: '23505', message: duplicate })).toBe('Ya hay una temporada con ese nombre.')
    expect(message({ code: '23505', message: duplicate.replace('seasons', 'competitions') })).toBe(
      'Ya hay una competición con ese nombre.',
    )
    expect(message({ code: '23514', message: badRange })).toBe('La fecha de fin tiene que ser posterior a la de inicio.')
  })

  it.each(['42501', 'PGRST116'])('sin permiso, o sobre algo que ya no existe (%s), lo dice', (code) => {
    expect(message({ code, message: 'x' })).toBe('No tienes permiso para hacer esto, o ya no existe.')
  })

  it('cualquier otro fallo (sin red, por ejemplo) usa la frase de la pantalla, sin detalles técnicos', () => {
    expect(message({ code: '', message: 'TypeError: Failed to fetch' })).toBe(FALLBACK)
    expect(message({ code: '23505', message: 'unique constraint "otra_key"' })).toBe(FALLBACK)
  })
})
