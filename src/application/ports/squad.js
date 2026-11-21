// Port de la plantilla: lo que la aplicación necesita para la pantalla de estadísticas.
// Solo documentación (JSDoc): JavaScript no tiene interfaces.

/**
 * @typedef {{ id: number, name: string, isCurrent: boolean }} Season
 * @typedef {{ id: number, name: string }} Competition
 * @typedef {'goalkeeper' | 'defender' | 'winger' | 'pivot' | 'universal'} Position
 * @typedef {{
 *   id: number, name: string, shirtNumber: number, position: Position, photoUrl: string | null,
 *   matchesPlayed: number, goals: number, assists: number, yellowCards: number, redCards: number,
 *   avgRating: number | null, mvps: number, goalsConceded: number
 * }} SquadPlayer totales de la temporada; `avgRating` es null si no hay votaciones cerradas
 *
 * @typedef {object} SquadRepository
 * @property {() => Promise<Season[]>} getSeasons de la más reciente a la más antigua
 * @property {() => Promise<Competition[]>} getCompetitions
 * @property {(filters: { seasonId: number, competitionId: number | null }) => Promise<SquadPlayer[]>} getSquadStats
 *   `competitionId` null = todas las competiciones
 */

export {}
