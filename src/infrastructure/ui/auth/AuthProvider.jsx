import { useEffect, useState } from 'react'
import { useUseCases } from '../use-cases-context'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }) {
  const { getCurrentSession, watchSession, getProfile, signOut } = useUseCases()
  const [user, setUser] = useState(null)
  const [loaded, setLoaded] = useState({ userId: null, data: null }) // perfil + de qué usuario es
  const [sessionReady, setSessionReady] = useState(false)

  // 1. Sesión: la leemos al cargar y escuchamos login/logout.
  useEffect(() => {
    getCurrentSession().then((current) => {
      setUser(current)
      setSessionReady(true)
    })
    return watchSession(setUser)
  }, [getCurrentSession, watchSession])

  // 2. Perfil (rol): se pide aparte, fuera del aviso de sesión, para no bloquear el auth.
  const userId = user?.id
  useEffect(() => {
    if (!userId) return
    getProfile(userId).then((data) => setLoaded({ userId, data }))
  }, [userId, getProfile])

  // Si el perfil cargado es de otro usuario (o aún no hay), cuenta como "no cargado".
  const profile = loaded.userId === userId ? loaded.data : null
  const profileReady = !userId || loaded.userId === userId

  const value = {
    user,
    profile,
    role: profile?.role ?? null,
    loading: !sessionReady || !profileReady,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
