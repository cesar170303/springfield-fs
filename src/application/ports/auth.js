// Ports de autenticación: contratos que la aplicación necesita y que la infraestructura implementa.
// Solo documentación (JSDoc): JavaScript no tiene interfaces.

/**
 * @typedef {{ id: string, email: string }} SessionUser
 * @typedef {{ id: string, email: string, fullName: string | null, role: 'superadmin' | 'admin' | 'player' | 'viewer' }} Profile
 * @typedef {{ email: string, password: string }} Credentials
 *
 * @typedef {object} AuthGateway
 * @property {() => Promise<SessionUser | null>} getSession
 * @property {(listener: (user: SessionUser | null) => void) => () => void} onSessionChange devuelve la función para darse de baja
 * @property {(credentials: Credentials) => Promise<{ error: string | null }>} signInWithPassword
 * @property {(credentials: Credentials) => Promise<{ hasSession: boolean, error: string | null }>} signUp
 * @property {() => Promise<{ error: string | null }>} signInWithGoogle
 * @property {() => Promise<void>} signOut
 *
 * @typedef {object} ProfileRepository
 * @property {(userId: string) => Promise<Profile | null>} getById
 */

export {}
