/**
 * @param {{ authGateway: import('../ports/auth').AuthGateway, profileRepository: import('../ports/auth').ProfileRepository }} deps
 */
export function createAuthUseCases({ authGateway, profileRepository }) {
  return {
    getCurrentSession: () => authGateway.getSession(),
    watchSession: (listener) => authGateway.onSessionChange(listener),
    getProfile: (userId) => profileRepository.getById(userId),
    signInWithPassword: (credentials) => authGateway.signInWithPassword(credentials),
    signInWithGoogle: () => authGateway.signInWithGoogle(),
    signOut: () => authGateway.signOut(),

    async signUp(credentials) {
      const { hasSession, error } = await authGateway.signUp(credentials)
      if (error) return { status: 'error', message: error }
      // Con la confirmación de correo activa, el registro no abre sesión todavía.
      if (!hasSession) return { status: 'confirmation-required', message: 'Revisa tu correo para confirmar la cuenta.' }
      return { status: 'signed-in', message: null }
    },
  }
}
