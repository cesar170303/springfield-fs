const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

// 'sm' para las listas de la plantilla; 'lg' para la ficha del jugador.
const SIZES = {
  sm: { box: 'gap-2 font-bold', item: 'gap-1', card: 'h-3 w-2 rounded-xs' },
  lg: { box: 'gap-4 type-number', item: 'gap-1.5', card: 'h-8 w-5 rounded-sm' },
}

/** Tarjetas amarillas y rojas, dibujadas con su forma y su número (nunca solo con el color). */
export default function CardsCount({ yellow, red, size = 'sm' }) {
  const s = SIZES[size]
  return (
    <span
      aria-label={`${plural(yellow, 'amarilla', 'amarillas')} y ${plural(red, 'roja', 'rojas')}`}
      className={`inline-flex items-center tabular-nums ${s.box}`}
    >
      <span aria-hidden="true" className={`inline-flex items-center ${s.item}`}>
        <span className={`${s.card} bg-card-yellow`} />
        {yellow}
      </span>
      <span aria-hidden="true" className={`inline-flex items-center ${s.item}`}>
        <span className={`${s.card} bg-danger`} />
        {red}
      </span>
    </span>
  )
}
