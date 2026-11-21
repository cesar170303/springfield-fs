const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

/** Tarjetas amarillas y rojas, dibujadas con su forma y su número (nunca solo con el color). */
export default function CardsCount({ yellow, red }) {
  return (
    <span
      aria-label={`${plural(yellow, 'amarilla', 'amarillas')} y ${plural(red, 'roja', 'rojas')}`}
      className="inline-flex items-center gap-2 font-bold tabular-nums"
    >
      <span aria-hidden="true" className="inline-flex items-center gap-1">
        <span className="h-3 w-2 rounded-xs bg-card-yellow" />
        {yellow}
      </span>
      <span aria-hidden="true" className="inline-flex items-center gap-1">
        <span className="h-3 w-2 rounded-xs bg-danger" />
        {red}
      </span>
    </span>
  )
}
