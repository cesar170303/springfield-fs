import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)

// Devuelve { session, user, profile, role, loading, signOut }
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
