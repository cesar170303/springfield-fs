import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { formatScore, voteStats } from '../../../domain/vote'
import { positionLabel } from '../../../domain/squad'
import { Draggable, gsap, motionAllowed, useMotion } from '../motion'
import { swipeDecision, swipeProgress } from '../swipe'

/**
 * Tarjeta de un compañero (docs/SPEC.md §6): foto a sangre (sin foto, el dorsal), apodo, franja con sus datos del
 * partido y la barra de la nota, que empieza sin nota. Se vota con «Aceptar nota» o deslizando a la derecha y se salta
 * con «Saltar por ahora» o deslizando a la izquierda. `onAccept` recibe la nota (o null, para que la pantalla avise).
 * Con «reducir movimiento» la tarjeta se sigue arrastrando (la mueve el dedo), pero sin vuelos ni efectos.
 */
export default function VoteCard({ vote, matchLabel, opponent, canSkip, onAccept, onSkip }) {
  const [score, setScore] = useState(null)
  const card = useRef(null)
  const scoreText = useRef(null)
  const stamps = useRef({})
  const leaving = useRef(false)
  const actions = useRef({})
  const { player } = vote
  const text = score === null ? 'sin nota' : formatScore(score)

  // Entra desde su sitio en la pila: un poco más pequeña y más arriba.
  useMotion(() => {
    gsap.from(card.current, { scale: 0.94, y: -16, duration: 0.35, ease: 'power2.out' })
  }, card)

  function showStamps(progress) {
    gsap.set(stamps.current.yes, { opacity: Math.max(0, progress) })
    gsap.set(stamps.current.no, { opacity: Math.max(0, -progress) })
  }

  function backToPlace() {
    showStamps(0)
    if (motionAllowed()) gsap.to(card.current, { x: 0, rotation: 0, duration: 0.5, ease: 'elastic.out(1, 0.6)' })
    else gsap.set(card.current, { x: 0, rotation: 0 })
  }

  // Sale por un lado (1 derecha, -1 izquierda) y después avisa a la pantalla, que monta la siguiente.
  function leave(direction, then) {
    if (leaving.current) return
    leaving.current = true
    if (!motionAllowed()) return then()
    gsap.to(card.current, {
      x: direction * window.innerWidth,
      rotation: direction * 22,
      opacity: 0,
      duration: 0.35,
      ease: 'power2.in',
      onComplete: then,
    })
  }

  function accept() {
    if (score === null) {
      backToPlace()
      return onAccept(null)
    }
    leave(1, () => onAccept(score))
  }

  function skip() {
    if (!canSkip) {
      backToPlace()
      return onSkip()
    }
    leave(-1, onSkip)
  }

  // El gesto se crea una vez; lee siempre la nota y las acciones del último render.
  useLayoutEffect(() => {
    actions.current = { accept, skip }
  })

  useEffect(() => {
    const el = card.current
    const [drag] = Draggable.create(el, {
      type: 'x',
      dragClickables: false, // sobre la barra y los botones no empieza el gesto (SPEC §6)
      zIndexBoost: false,
      onDrag() {
        const width = el.offsetWidth
        if (motionAllowed()) gsap.set(el, { rotation: (this.x / width) * 14 })
        showStamps(swipeProgress(this.x, width))
      },
      onRelease() {
        const decision = swipeDecision(this.x, el.offsetWidth)
        if (decision === 'vote') actions.current.accept()
        else if (decision === 'skip') actions.current.skip()
        else backToPlace()
      },
    })
    return () => drag.kill()
  }, [])

  function changeScore(value) {
    setScore(value)
    if (motionAllowed()) {
      gsap.fromTo(
        scoreText.current,
        { scale: 1.22 },
        { scale: 1, duration: 0.45, ease: 'elastic.out(1, 0.45)', overwrite: true },
      )
    }
  }

  return (
    <article
      ref={card}
      aria-labelledby="vote-name"
      className="relative flex touch-pan-y flex-col overflow-hidden rounded-3xl bg-surface shadow-2xl select-none"
    >
      <span
        ref={(el) => (stamps.current.yes = el)}
        aria-hidden="true"
        className="absolute top-5 left-4 z-10 -rotate-10 rounded-lg border-3 border-accent-text px-3 pt-1.5 pb-1 type-name text-[2rem] text-accent-text uppercase opacity-0"
      >
        Votar {formatScore(score)}
      </span>
      <span
        ref={(el) => (stamps.current.no = el)}
        aria-hidden="true"
        className="absolute top-5 right-4 z-10 rotate-10 rounded-lg border-3 border-text px-3 pt-1.5 pb-1 type-name text-[2rem] uppercase opacity-0"
      >
        Saltar
      </span>

      <div className="relative h-52 shrink-0 overflow-hidden bg-line">
        {player.photoUrl ? (
          <img src={player.photoUrl} alt="" draggable="false" className="absolute inset-0 size-full object-cover" />
        ) : (
          <span
            aria-hidden="true"
            className="absolute top-0 right-4 type-display text-[13rem] leading-none text-accent-text"
          >
            {player.shirtNumber}
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-b from-transparent to-surface" />
        <span className="absolute top-3 left-3 rounded-full bg-bg/60 px-2 py-1 type-label uppercase">
          {matchLabel} · {opponent}
        </span>
      </div>

      <div className="relative -mt-14 px-4">
        <h2 id="vote-name" className="type-display uppercase">
          {player.name}
        </h2>
        <p className="type-small text-text-muted">
          {positionLabel(player.position)}
          {player.shirtNumber !== null && ` · ${player.shirtNumber}`}
        </p>
      </div>

      <div className="mx-4 mt-3 flex border-y border-line">
        {voteStats(vote).map(({ value, unit }) => (
          <div key={unit} className="flex flex-1 flex-col border-l border-line py-2 pl-3 first:border-l-0 first:pl-0">
            <span className="type-number">{value}</span>
            <span className="type-label text-text-muted">{unit}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 px-4 pt-4 pb-3">
        <div className="flex items-baseline justify-between">
          <label htmlFor="vote-score" className="type-small font-semibold text-text-muted">
            Tu nota
          </label>
          {/* Lo que lee el lector de pantalla es aria-valuetext de la barra; esto es solo visual. */}
          <span
            ref={scoreText}
            aria-hidden="true"
            className="origin-bottom-right type-display text-accent-text tabular-nums"
          >
            {formatScore(score)}
          </span>
        </div>
        <input
          id="vote-score"
          type="range"
          min="1"
          max="10"
          step="0.5"
          value={score ?? 5.5}
          aria-valuetext={text}
          onChange={(e) => changeScore(Number(e.target.value))}
          className="w-full accent-accent"
        />
        <div aria-hidden="true" className="flex justify-between type-label text-text-muted">
          <span>1</span>
          <span>5,5</span>
          <span>10</span>
        </div>
        <button
          type="button"
          onClick={accept}
          className="mt-2 min-h-12 rounded-md bg-accent px-4 type-body font-bold text-on-accent"
        >
          Aceptar nota
        </button>
        <button type="button" onClick={skip} className="min-h-11 self-center px-3 type-small underline">
          Saltar por ahora
        </button>
        <p className="text-center type-label text-text-muted">
          Desliza a la derecha para votar y a la izquierda para saltar.
        </p>
      </div>
    </article>
  )
}
