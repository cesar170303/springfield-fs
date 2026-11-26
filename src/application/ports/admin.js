// Ports del panel de admin (docs/SPEC.md §12). Solo documentación (JSDoc): JavaScript no tiene interfaces.
// Los métodos fallan con un Error cuyo mensaje es una frase que la pantalla enseña tal cual.

/**
 * @typedef {{ id: number, name: string, startDate: string, endDate: string, isCurrent: boolean }} AdminSeason
 *   las fechas, como 'AAAA-MM-DD'
 * @typedef {{ name: string, startDate: string, endDate: string }} SeasonData
 * @typedef {'league' | 'cup' | 'friendly'} CompetitionType
 * @typedef {{ id: number, name: string, type: CompetitionType }} AdminCompetition
 * @typedef {{ name: string, type: CompetitionType }} CompetitionData
 *
 * @typedef {object} SeasonAdminRepository
 * @property {() => Promise<AdminSeason[]>} getSeasons de la más reciente a la más antigua
 * @property {(season: SeasonData) => Promise<void>} createSeason
 * @property {(id: number, season: SeasonData) => Promise<void>} updateSeason
 * @property {(id: number) => Promise<void>} setCurrentSeason deja de ser actual la que lo fuera
 * @property {(id: number) => Promise<void>} deleteSeason con su plantilla y sus votantes; falla si tiene partidos
 * @property {() => Promise<AdminCompetition[]>} getCompetitions
 * @property {(competition: CompetitionData) => Promise<void>} createCompetition
 * @property {(id: number, competition: CompetitionData) => Promise<void>} updateCompetition
 * @property {(id: number) => Promise<void>} deleteCompetition falla si tiene partidos
 */

/**
 * @typedef {'goalkeeper' | 'defender' | 'winger' | 'pivot' | 'universal'} PlayerPosition
 * @typedef {'available' | 'injured' | 'suspended'} PlayerStatus
 * @typedef {{ firstName: string, lastName: string, nickname: string | null, email: string | null,
 *   position: PlayerPosition, status: PlayerStatus }} PlayerData
 * @typedef {PlayerData & { id: number, photoPath: string | null, photoUrl: string | null, hasAccount: boolean,
 *   archived: boolean }} AdminPlayer
 *   `photoPath`: ruta de la foto en el almacén; `photoUrl`, su dirección pública
 *   `hasAccount`: la ficha ya está vinculada a una cuenta (por el correo confirmado)
 *
 * @typedef {object} PlayerAdminRepository
 * @property {() => Promise<AdminPlayer[]>} getPlayers todas, activas y archivadas, con su correo
 * @property {(player: PlayerData) => Promise<number>} createPlayer devuelve el id de la ficha nueva
 * @property {(id: number, player: PlayerData) => Promise<void>} updatePlayer
 * @property {(id: number, archived: boolean) => Promise<void>} setArchived
 * @property {(path: string, photo: Blob) => Promise<void>} uploadPhoto sube un archivo nuevo al almacén de fotos
 * @property {(id: number, path: string | null) => Promise<void>} setPhotoPath apunta la foto en la ficha (null: sin foto)
 * @property {(path: string) => Promise<void>} deletePhoto borra un archivo del almacén de fotos
 */

export {}
