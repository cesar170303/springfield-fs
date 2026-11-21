import { useRef } from 'react'
import { LEADER_STATS, topThree } from '../../../domain/squad'
import { formatStat } from '../format'
import { gsap, useMotion } from '../motion'
import CardsCount from './CardsCount'
import PlayerAvatar from './PlayerAvatar'

/** Vista inicial de la plantilla: una tarjeta por estadística con sus 3 mejores (docs/SPEC.md §5). */
export default function LeaderCards({ players }) {
  const root = useRef(null)

  // Cifras que ruedan hasta su valor (docs/SPEC.md §11). React ya pinta el valor final: con «reducir movimiento» se
  // queda así, y con movimiento la animación arranca en 0 y acaba en el mismo texto.
  useMotion(() => {
    for (const el of root.current.querySelectorAll('[data-count]')) {
      const end = Number(el.dataset.count)
      const decimals = Number(el.dataset.decimals)
      gsap.fromTo(
        el,
        { innerText: 0 },
        {
          innerText: end,
          duration: 0.9,
          ease: 'power3.out',
          modifiers: { innerText: (v) => formatStat(Number(v), decimals) },
        },
      )
    }
  }, root)

  return (
    <div ref={root} className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {LEADER_STATS.map((stat) => {
        const leaders = topThree(players, stat)
        const decimals = stat.key === 'avgRating' ? 1 : 0
        return (
          <section key={stat.key} aria-label={stat.label} className="rounded-lg bg-surface px-4 pt-4 pb-1">
            <h2 className="type-title mb-2">{stat.label}</h2>
            {leaders.length === 0 ? (
              <p className="type-small border-t border-line py-3 text-text-muted">Nadie todavía.</p>
            ) : (
              <ol>
                {leaders.map((p, i) => {
                  const value = stat.value(p)
                  return (
                    <li key={p.id} className="flex items-center gap-3 border-t border-line py-2">
                      <PlayerAvatar name={p.name} photoUrl={p.photoUrl} />
                      <span className="flex-1 truncate">{p.name}</span>
                      {stat.key === 'cards' ? (
                        <CardsCount yellow={p.yellowCards} red={p.redCards} />
                      ) : (
                        // key={value}: si cambia la cifra, React crea otro nodo en vez de tocar el que movió GSAP.
                        <span
                          key={value}
                          data-count={value}
                          data-decimals={decimals}
                          className={`font-bold tabular-nums ${i === 0 ? 'rounded-full bg-highlight px-2.5 text-on-highlight' : 'px-2.5'}`}
                        >
                          {formatStat(value, decimals)}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ol>
            )}
          </section>
        )
      })}
    </div>
  )
}
