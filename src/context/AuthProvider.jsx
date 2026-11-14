import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loaded, setLoaded] = useState({ userId: null, data: null }) // perfil + de qué usuario es
  const [sessionReady, setSessionReady] = useState(false)

  // 1. Sesión: la leemos al cargar y escuchamos login/logout.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  // 2. Perfil (rol): se pide aparte, fuera del callback de arriba, para no bloquear el auth.
  const userId = session?.user.id
  useEffect(() => {
    if (!userId) return
    supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('id', userId)
      .single()
      .then(({ data }) => setLoaded({ userId, data }))
  }, [userId])

  // Si el perfil cargado es de otro usuario (o aún no hay), cuenta como "no cargado".
  const profile = loaded.userId === userId ? loaded.data : null
  const profileReady = !userId || loaded.userId === userId

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.role ?? null,
    loading: !sessionReady || !profileReady,
    signOut: () => supabase.auth.signOut(),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
