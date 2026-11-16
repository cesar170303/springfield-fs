import { describe, expect, it } from 'vitest'
import { displayName } from './user'

describe('displayName', () => {
  it('usa el nombre completo si existe', () => {
    expect(displayName({ fullName: 'Jugador Uno', email: 'jugador@example.com' })).toBe('Jugador Uno')
  })

  it('usa el correo si no hay nombre', () => {
    expect(displayName({ fullName: null, email: 'jugador@example.com' })).toBe('jugador@example.com')
  })

  it('usa el correo si el nombre está vacío', () => {
    expect(displayName({ fullName: '', email: 'jugador@example.com' })).toBe('jugador@example.com')
  })
})
