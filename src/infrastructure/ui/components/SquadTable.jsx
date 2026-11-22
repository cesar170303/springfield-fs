import { useState } from 'react'
import { groupByPosition, sortSquad } from '../../../domain/squad'
import { formatStat } from '../format'
import CardsCount from './CardsCount'
import PlayerAvatar from './PlayerAvatar'
import PlayerLink from './PlayerLink'

const SORTS = [
  ['shirt', 'Dorsal'],
  ['goals', 'Goles'],
  ['assists', 'Asistencias'],
  ['avgRating', 'Valoración'],
  ['mvps', 'MVPs'],
  ['matchesPlayed', 'Partidos'],
  ['cards', 'Tarjetas'],
]

const num = 'px-1 text-center tabular-nums'

/** Vista lista: por dorsal y agrupada por posición, o lista única al ordenar por una estadística (docs/SPEC.md §5). */
export default function SquadTable({ players }) {
  const [sortBy, setSortBy] = useState('shirt')
  const groups =
    sortBy === 'shirt'
      ? groupByPosition(players)
      : [{ position: 'all', label: null, players: sortSquad(players, sortBy) }]

  return (
    <>
      <label className="mb-2 flex items-center gap-2 type-small text-text-muted">
        Ordenar por
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-md border border-border bg-bg px-3 py-2 text-text"
        >
          {SORTS.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <table className="w-full type-small">
        <caption className="sr-only">Estadísticas de la plantilla</caption>
        <thead className="type-label text-text-muted">
          <tr>
            <th className="w-8 py-2 text-left font-medium">
              <span className="sr-only">Dorsal</span>
            </th>
            <th className="py-2 text-left font-medium">Jugador</th>
            <th className={`${num} font-medium`}>
              <abbr title="Partidos jugados">PJ</abbr>
            </th>
            <th className={`${num} font-medium`}>
              <abbr title="Goles (al portero, encajados)">G</abbr>
            </th>
            <th className={`${num} font-medium`}>
              <abbr title="Asistencias">A</abbr>
            </th>
            <th className={`${num} font-medium`}>Tarj.</th>
            <th className={`${num} font-medium`}>
              <abbr title="Valoración media">Val.</abbr>
            </th>
          </tr>
        </thead>
        {groups.map((group) => (
          <tbody key={group.position}>
            {group.label && (
              <tr>
                <th colSpan={7} className="pt-4 pb-1 text-left type-label font-medium text-text-muted">
                  {group.label}
                </th>
              </tr>
            )}
            {group.players.map((p) => (
              <tr key={p.id} className="border-t border-line">
                <td className="py-2">
                  <span className="grid size-6 place-items-center rounded-xs bg-highlight type-label font-extrabold text-on-highlight">
                    {p.shirtNumber}
                  </span>
                </td>
                <th scope="row" className="py-2 text-left font-normal">
                  <span className="flex items-center gap-2">
                    <PlayerAvatar name={p.name} photoUrl={p.photoUrl} />
                    <PlayerLink id={p.id} className="truncate">
                      {p.name}
                    </PlayerLink>
                  </span>
                </th>
                <td className={num}>{p.matchesPlayed}</td>
                <td className={num}>{p.position === 'goalkeeper' ? p.goalsConceded : p.goals}</td>
                <td className={num}>{p.assists}</td>
                <td className={num}>
                  <CardsCount yellow={p.yellowCards} red={p.redCards} />
                </td>
                <td className={num}>{formatStat(p.avgRating, 1)}</td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </>
  )
}
