export const HAS_MATCHES = 'No se puede borrar: ya tiene partidos.'

// Frase de cada restricción de la base de datos, por su nombre en Postgres. Cada pantalla del panel añade las suyas.
const CONSTRAINTS = {
  seasons_name_key: 'Ya hay una temporada con ese nombre.',
  competitions_name_key: 'Ya hay una competición con ese nombre.',
  matches_season_id_fkey: HAS_MATCHES,
  matches_competition_id_fkey: HAS_MATCHES,
  players_email_key: 'Ya hay una ficha con ese correo.',
  player_seasons_season_id_shirt_number_key: 'Ese dorsal ya lo lleva otro jugador esta temporada.',
  player_seasons_pkey: 'Ese jugador ya está en la plantilla.',
  matches_season_id_competition_id_round_key: 'Ya hay un partido de esa competición en esa jornada.',
  matches_check: 'Un partido terminado necesita el resultado.',
  season_voters_pkey: 'Ya vota esta temporada.',
  player_seasons_shirt_number_check: 'El dorsal tiene que ser un número del 1 al 99.',
  seasons_check:'La fecha de fin tiene que ser posterior a la de inicio.',
}

/** Error de Supabase → Error con una frase para la pantalla. `fallback` es la frase si no hay una mejor. */
export function readableError({ code, message }, fallback) {
  // raise exception de un trigger: ya es una frase en español, sin el punto final.
  if (code === 'P0001') return new Error(`${message}.`)
  // PGRST116: se pidió la fila cambiada y no hay ninguna (RLS la ha ignorado o se ha borrado).
  if (code === '42501' || code === 'PGRST116') return new Error('No tienes permiso para hacer esto, o ya no existe.')
  const constraint = Object.keys(CONSTRAINTS).find((name) => message.includes(`"${name}"`))
  return new Error(CONSTRAINTS[constraint] ?? fallback)
}
