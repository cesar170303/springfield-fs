// Frase de cada restricción de la base de datos, por su nombre en Postgres. Cada pantalla del panel añade las suyas.
const CONSTRAINTS = {
  seasons_name_key: 'Ya hay una temporada con ese nombre.',
  competitions_name_key: 'Ya hay una competición con ese nombre.',
  seasons_check: 'La fecha de fin tiene que ser posterior a la de inicio.',
}

/** Error de Supabase → Error con una frase para la pantalla. `fallback` es la frase si no hay una mejor. */
export function readableError({ code, message }, fallback) {
  // raise exception de un trigger: ya es una frase en español.
  if (code === 'P0001') return new Error(message.endsWith('.') ? message : `${message}.`)
  // PGRST116: se pidió la fila cambiada y no hay ninguna (RLS la ha ignorado o se ha borrado).
  if (code === '42501' || code === 'PGRST116') return new Error('No tienes permiso para hacer esto, o ya no existe.')
  const constraint = Object.keys(CONSTRAINTS).find((name) => message.includes(`"${name}"`))
  return new Error(CONSTRAINTS[constraint] ?? fallback)
}
