import { statCards } from '../../../domain/player'
import CardsCount from './CardsCount'

/** Las seis cifras de la temporada en la ficha, con su detalle; una va destacada en azul. */
export default function PlayerStatCards({ player }) {
  return (
    <section aria-label="Estadísticas de la temporada" className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3">
      {statCards(player).map((card) => {
        const muted = card.highlight ? '' : 'text-text-muted'
        return (
          <div
            key={card.key}
            data-reveal
            className={`rounded-lg p-4 md:p-5 ${card.highlight ? 'bg-accent text-on-accent' : 'bg-surface'}`}
          >
            {card.key === 'cards' ? (
              <CardsCount yellow={card.yellow} red={card.red} size="lg" />
            ) : (
              <span data-count={card.value} className="block type-number text-5xl leading-none md:text-6xl">
                {card.value}
              </span>
            )}
            <p className={`mt-1 type-small ${muted}`}>{card.label}</p>
            {card.note && <p className={`type-label ${muted}`}>{card.note}</p>}
          </div>
        )
      })}
    </section>
  )
}
