import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { statusLabel } from '../../../domain/player'
import { positionLabel } from '../../../domain/squad'
import { countUp, gsap, ScrollTrigger, SplitText, useMotion } from '../motion'
import { useUseCases } from '../use-cases-context'
import { useSeasonFilters } from '../use-season-filters'
import MatchLog from './MatchLog'
import PlayerStatCards from './PlayerStatCards'
import RatingChart from './RatingChart'
import RatingGauge from './RatingGauge'
import SeasonFilters from './SeasonFilters'

/** Ficha del jugador (docs/SPEC.md §5 y §7), en /jugador/:playerId con la temporada y la competición de la URL. */
export default function PlayerScreen() {
  const { playerId } = useParams()
  const { search } = useLocation()
  const { getPlayerSheet } = useUseCases()
  const season = useSeasonFilters()
  const { filters, seasonId, competitionId } = season
  const id = Number(playerId)
  const validId = Number.isInteger(id) && id > 0
  // Cada respuesta se guarda con lo que la pidió: si no es lo de ahora, está cargando.
  const [result, setResult] = useState({ key: null, sheet: null, failed: false })
  const key = `${id}-${seasonId}-${competitionId}`
  const current = result.key === key ? result : { sheet: null, failed: false }

  useEffect(() => {
    if (!validId || seasonId === null) return
    let stale = false // si cambian el jugador o los filtros antes de que llegue la respuesta, ya no vale
    const requested = `${id}-${seasonId}-${competitionId}`
    getPlayerSheet({ playerId: id, seasonId, competitionId })
      .then((sheet) => !stale && setResult({ key: requested, sheet, failed: false }))
      .catch(() => !stale && setResult({ key: requested, sheet: null, failed: true }))
    return () => {
      stale = true
    }
  }, [getPlayerSheet, id, validId, seasonId, competitionId])

  function content() {
    if (season.failed || current.failed) {
      return (
        <p role="alert" className="type-small text-danger">
          No se pudo cargar la ficha. Inténtalo de nuevo.
        </p>
      )
    }
    if (filters && filters.initialSeasonId === null)
      return <p className="text-text-muted">Aún no hay ninguna temporada.</p>
    if (!validId || current.sheet?.player === null) {
      return (
        <>
          <SeasonFilters {...season} />
          <p className="text-text-muted">No hay ficha de este jugador en esta temporada.</p>
        </>
      )
    }
    if (!current.sheet) return <p className="text-text-muted">Cargando…</p>
    // La key vuelve a montar la ficha al cambiar de filtros: así las cifras vuelven a rodar.
    return <PlayerSheet key={key} {...current.sheet} season={season} />
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 pb-6">
      <Link
        to={{ pathname: '/', search }}
        aria-label="Volver a la plantilla"
        className="flex min-h-11 items-center self-start type-small text-accent-text"
      >
        ‹ Plantilla
      </Link>
      {content()}
    </main>
  )
}

/**
 * Movimiento de la ficha (docs/SPEC.md §11): el apodo entra letra a letra y cada bloque sube al aparecer en pantalla
 * (ScrollTrigger.batch), con sus cifras rodando, el medidor llenándose y la gráfica dibujándose.
 */
function animateSheet(root) {
  const title = SplitText.create(root.querySelector('[data-split]'), { type: 'chars' })
  gsap.from(title.chars, { yPercent: 60, autoAlpha: 0, duration: 0.8, ease: 'power4.out', stagger: 0.075 })

  const blocks = root.querySelectorAll('[data-reveal]')
  gsap.set(blocks, { autoAlpha: 0, y: 14 })
  ScrollTrigger.batch(blocks, {
    start: 'top 92%',
    once: true,
    onEnter: (entered) => {
      gsap.to(entered, { autoAlpha: 1, y: 0, duration: 1, ease: 'power4.out', stagger: 0.075 })
      for (const block of entered) animateBlock(block)
    },
  })
}

function animateBlock(block) {
  countUp(block.querySelectorAll('[data-count]'))
  const gauge = block.querySelector('[data-gauge]')
  if (gauge) {
    gsap.fromTo(
      gauge,
      { attr: { 'stroke-dasharray': '0 100' } },
      { attr: { 'stroke-dasharray': `${gauge.dataset.gauge} 100` }, duration: 0.9, ease: 'power3.out' },
    )
  }
  if (block.matches('[data-chart]')) {
    // Con pathLength = 1, el trazo entero mide 1: de 1 a 0 se dibuja de izquierda a derecha.
    gsap.fromTo(
      block.querySelectorAll('[data-draw]'),
      { strokeDasharray: 1, strokeDashoffset: 1 },
      { strokeDashoffset: 0, duration: 1.4, ease: 'power3.out', stagger: 0.15, delay: 0.2 },
    )
    gsap.from(block.querySelectorAll('[data-dot]'), {
      scale: 0,
      autoAlpha: 0,
      transformOrigin: '50% 50%',
      duration: 0.45,
      ease: 'back.out(2)',
      stagger: 0.06,
      delay: 0.2,
    })
    gsap.from(block.querySelectorAll('[data-fade]'), { autoAlpha: 0, duration: 0.8, delay: 0.9 })
  }
}

function PlayerSheet({ player, timeline, matches, season }) {
  const root = useRef(null)
  useMotion(() => animateSheet(root.current), root)

  return (
    <div ref={root} className="flex flex-col gap-4">
      <header
        data-reveal
        className="relative flex flex-col gap-4 overflow-hidden pt-2 pb-6 md:flex-row md:items-end md:gap-7"
      >
        {/* Dorsal de fondo: relleno gris de las tarjetas, contorno más claro y se difumina hacia abajo. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-4.5 right-0 type-number text-[13.75rem] leading-none text-surface [-webkit-text-stroke:1.5px_color-mix(in_oklab,var(--color-border)_70%,transparent)] [mask-image:linear-gradient(to_bottom,black_35%,transparent_95%)] md:-top-6 md:text-[18.75rem] md:[-webkit-text-stroke-width:2px]"
        >
          {player.shirtNumber}
        </span>
        <PlayerPhoto player={player} />
        <div className="relative flex min-w-0 flex-1 flex-col gap-3">
          <div>
            <h1
              data-split
              className="overflow-hidden pb-1 type-display text-[4rem] leading-[0.9] uppercase md:text-[7rem] md:leading-[0.85]"
            >
              {player.name}
            </h1>
            <p className="mt-1.5 type-small text-text-muted md:type-body">
              {player.fullName} · dorsal {player.shirtNumber}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-border px-3 py-1.5 type-label">
              {positionLabel(player.position)}
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 type-label">
              <span
                aria-hidden="true"
                className={`size-2 rounded-full ${player.status === 'available' ? 'bg-accent-text' : 'bg-danger'}`}
              />
              {statusLabel(player.status)}
            </span>
          </div>
        </div>
        <SeasonFilters {...season} className="relative *:flex-1 md:*:flex-none" />
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        <RatingGauge avg={player.avgRating} ratedMatches={player.ratedMatches} />
        <div className="md:col-span-2">
          <PlayerStatCards player={player} />
        </div>
      </div>

      <div className="mt-6 grid gap-8 md:grid-cols-3">
        <div className="min-w-0 md:col-span-2">
          <RatingChart timeline={timeline} competitionFiltered={season.competitionId !== null} />
        </div>
        <MatchLog matches={matches} />
      </div>
    </div>
  )
}

function PlayerPhoto({ player }) {
  const box = 'relative size-24 shrink-0 rounded-[1.25rem] md:size-40 md:rounded-[1.75rem]'
  if (player.photoUrl) {
    // Decorativa: el apodo va al lado, en el título.
    return <img src={player.photoUrl} alt="" width="160" height="160" className={`${box} object-cover`} />
  }
  return (
    <span
      aria-hidden="true"
      className={`${box} grid place-items-center border border-line bg-surface type-number text-text-muted`}
    >
      {player.name.slice(0, 2).toUpperCase()}
    </span>
  )
}
