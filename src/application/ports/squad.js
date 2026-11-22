// Port de la plantilla: lo que la aplicación necesita para la pantalla de estadísticas.
// Solo documentación (JSDoc): JavaScript no tiene interfaces.

/**
 * @typedef {{ id: number, name: string, isCurrent: boolean }} Season
 * @typedef {{ id: number, name: string }} Competition
 * @typedef {'goalkeeper' | 'defender' | 'winger' | 'pivot' | 'universal'} Position
 * @typedef {'available' | 'injured' | 'suspended'} PlayerStatus
 * @typedef {{
 *   id: number, name: string, fullName: string, shirtNumber: number, position: Position, status: PlayerStatus,
 *   photoUrl: string | null, matchesCalled: number, matchesPlayed: number, minutes: number,
 *   goals: number, assists: number, penaltyGoals: number, yellowCards: number, redCards: number,
 *   avgRating: number | null, ratedMatches: number, mvps: number, goalsConceded: number, cleanSheets: number
 * }} SquadPlayer totales de la temporada; `avgRating` es null si no hay votaciones cerradas.
 *   `goalsConceded` y `cleanSheets` solo cuentan para el portero (0 en el resto)
 *
 * @typedef {object} SquadRepository
 * @property {() => Promise<Season[]>} getSeasons de la más reciente a la más antigua
 * @property {() => Promise<Competition[]>} getCompetitions
 * @property {(filters: { seasonId: number, competitionId: number | null }) => Promise<SquadPlayer[]>} getSquadStats
 *   `competitionId` null = todas las competiciones
 */

export {}
