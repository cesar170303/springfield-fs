// Nombre con el que se saluda a un usuario: su nombre completo o, si no tiene, su correo.
export function displayName({ fullName, email }) {
  return fullName || email
}

/** El staff gestiona el equipo desde el panel de admin. Solo decide qué se enseña: los permisos los da RLS. */
export const isStaff = (role) => role === 'admin' || role === 'superadmin'
