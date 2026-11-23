// Ports del panel de admin (docs/SPEC.md §12). Solo documentación (JSDoc): JavaScript no tiene interfaces.
// Los métodos fallan con un Error cuyo mensaje es una frase que la pantalla enseña tal cual.

/**
 * @typedef {{ id: number, name: string, startDate: string, endDate: string, isCurrent: boolean }} AdminSeason
 *   las fechas, como 'AAAA-MM-DD'
 * @typedef {{ name: string, startDate: string, endDate: string }} SeasonData
 *
 * @typedef {object} SeasonAdminRepository
 * @property {() => Promise<AdminSeason[]>} getSeasons de la más reciente a la más antigua
 * @property {(season: SeasonData) => Promise<void>} createSeason
 * @property {(id: number, season: SeasonData) => Promise<void>} updateSeason
 * @property {(id: number) => Promise<void>} setCurrentSeason deja de ser actual la que lo fuera
 */

export {}
