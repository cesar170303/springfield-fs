import { describe, expect, it } from 'vitest'
import { displayName, isStaff, isSuperadmin, roleWithoutAdmin } from './user'

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

describe('isStaff', () => {
  it.each(['admin', 'superadmin'])('%s es del staff', (role) => {
    expect(isStaff(role)).toBe(true)
  })

  it.each(['player', 'viewer', null])('%s no es del staff', (role) => {
    expect(isStaff(role)).toBe(false)
  })
})

describe('isSuperadmin', () => {
  it('solo el superadmin', () => {
    expect(isSuperadmin('superadmin')).toBe(true)
    expect(['admin', 'player', 'viewer', null].map(isSuperadmin)).toEqual([false, false, false, false])
  })
})

describe('roleWithoutAdmin', () => {
  it('al quitar el admin, vuelve a jugador si tiene ficha; si no, a viewer', () => {
    expect(roleWithoutAdmin({ hasPlayer: true })).toBe('player')
    expect(roleWithoutAdmin({ hasPlayer: false })).toBe('viewer')
  })
})
