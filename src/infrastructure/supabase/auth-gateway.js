import { toSessionUser } from './mappers'

const message = (error) => error?.message ?? null

/** @returns {import('../../application/ports/auth').AuthGateway} */
export function createSupabaseAuthGateway(client) {
  return {
    async getSession() {
      const { data } = await client.auth.getSession()
      return toSessionUser(data.session)
    },

    // El callback solo traduce y avisa: no hagas consultas a Supabase aquí dentro (bloquea el auth).
    onSessionChange(listener) {
      const { data } = client.auth.onAuthStateChange((_event, session) => listener(toSessionUser(session)))
      return () => data.subscription.unsubscribe()
    },

    async signInWithPassword(credentials) {
      const { error } = await client.auth.signInWithPassword(credentials)
      return { error: message(error) }
    },

    async signUp(credentials) {
      const { data, error } = await client.auth.signUp(credentials)
      return { hasSession: Boolean(data?.session), error: message(error) }
    },

    async signInWithGoogle() {
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })
      return { error: message(error) }
    },

    async signOut() {
      await client.auth.signOut()
    },
  }
}
