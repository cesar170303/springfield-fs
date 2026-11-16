// Traducen lo que devuelve Supabase (snake_case, objetos grandes) a los objetos que usa la aplicación.

export function toSessionUser(session) {
  return session ? { id: session.user.id, email: session.user.email } : null
}

export function toProfile(row) {
  return row ? { id: row.id, email: row.email, fullName: row.full_name, role: row.role } : null
}
