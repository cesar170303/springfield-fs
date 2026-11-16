// Nombre con el que se saluda a un usuario: su nombre completo o, si no tiene, su correo.
export function displayName({ fullName, email }) {
  return fullName || email
}
