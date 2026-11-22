const select = 'min-w-0 rounded-md border border-border bg-bg px-3 py-2 type-small'

/** Selectores de temporada y competición. Recibe lo que devuelve useSeasonFilters (los valores viven en la URL). */
export default function SeasonFilters({ filters, seasonId, competitionId, setSeason, setCompetition, className = '' }) {
  if (!filters?.seasons.length) return null
  return (
    <div className={`flex gap-2 ${className}`}>
      <select
        aria-label="Temporada"
        value={seasonId ?? ''}
        onChange={(e) => setSeason(Number(e.target.value))}
        className={select}
      >
        {filters.seasons.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <select
        aria-label="Competición"
        value={competitionId ?? ''}
        onChange={(e) => setCompetition(e.target.value ? Number(e.target.value) : null)}
        className={select}
      >
        <option value="">Todas</option>
        {filters.competitions.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  )
}
