// Reglas de los partidos y sus competiciones (docs/SPEC.md §3, §4 y §12).

/** Tipos de competición, en el orden en que se ofrecen. */
export const COMPETITION_TYPES = [
  { value: 'league', label: 'Liga' },
  { value: 'cup', label: 'Copa' },
  { value: 'friendly', label: 'Amistoso' },
]

export const competitionTypeLabel = (type) => COMPETITION_TYPES.find((t) => t.value === type)?.label
