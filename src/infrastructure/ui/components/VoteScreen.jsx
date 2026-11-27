import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { formatScore, skipFirst } from '../../../domain/vote'
import { formatShortDate } from '../format'
import { scoreText } from '../match-format'
import { useAsync } from '../use-async'
import { useUseCases } from '../use-cases-context'
import LoadError from './admin/LoadError'
import VoteCard from './VoteCard'

const UNDO_MS = 5000
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
const matchLine = (m) => `${m.label} · Springfield ${scoreText(m)} ${m.opponent}`
const primary = 'min-h-12 rounded-md bg-accent px-4 type-body font-bold text-on-accent'

/**
 * Pantalla de votación (docs/SPEC.md §6): portada, una tarjeta por compañero pendiente, partido a partido, y al
 * final tus notas. Cada voto espera 5 s para poder deshacerlo y solo cuenta cuando la base de datos lo confirma.
 */
export default function VoteScreen() {
  const { getVoteSession, castVote } = useUseCases()
  const { data: matches, error, reload } = useAsync(getVoteSession)
  const [stage, setStage] = useState('cover') // cover → cards; «between» y «done» se deducen al acabar un partido
  const [index, setIndex] = useState(0)
  const [queue, setQueue] = useState([])
  const [undoable, setUndoable] = useState([]) // votos aceptados, aún en su cuenta atrás
  const [sending, setSending] = useState(0)
  const [sent, setSent] = useState([])
  const [notice, setNotice] = useState(null)
  const [now, setNow] = useState(() => Date.now())
  const timers = useRef(new Map())

  const say = (text) => setNotice({ text, at: Date.now() })

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 3000)
    return () => clearTimeout(t)
  }, [notice])

  // Reloj de la cuenta atrás, solo mientras hay algo que deshacer.
  useEffect(() => {
    if (undoable.length === 0) return
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [undoable.length])

  function send(item) {
    setSending((n) => n + 1)
    castVote({ matchId: item.vote.matchId, playerId: item.vote.player.id, score: item.score })
      .then(() => setSent((s) => [...s, item]))
      .catch((e) => {
        say(e.message)
        setQueue((q) => [...q, item.vote])
      })
      .finally(() => setSending((n) => n - 1))
  }

  function commit(item) {
    timers.current.delete(item)
    setUndoable((list) => list.filter((x) => x !== item))
    send(item)
  }

  // Si se sale de la pantalla durante una cuenta atrás, esas notas se envían ya: se aceptaron (SPEC §6).
  useEffect(
    () => () => {
      for (const [item, t] of timers.current) {
        clearTimeout(t)
        castVote({ matchId: item.vote.matchId, playerId: item.vote.player.id, score: item.score }).catch(() => {})
      }
      timers.current.clear()
    },
    [castVote],
  )

  function accept(score) {
    if (score === null) return say('Elige una nota con la barra antes de votar.')
    const accepted = Date.now()
    const item = { vote: queue[0], score, deadline: accepted + UNDO_MS }
    setNow(accepted) // el reloj solo corre con algo que deshacer: sin esto, la cuenta saldría desde la última vez
    setQueue((q) => q.slice(1))
    setUndoable((list) => [...list, item])
    timers.current.set(
      item,
      setTimeout(() => commit(item), UNDO_MS),
    )
  }

  function skip() {
    const next = skipFirst(queue)
    if (!next) return say('Es el último que te falta: no se puede saltar.')
    setQueue(next)
  }

  function undo() {
    const item = undoable.at(-1)
    clearTimeout(timers.current.get(item))
    timers.current.delete(item)
    setUndoable((list) => list.slice(0, -1))
    setQueue((q) => [item.vote, ...q])
  }

  function startMatch(i) {
    setIndex(i)
    setQueue(matches[i].pending)
    setStage('cards')
  }

  if (error) {
    return (
      <Page>
        <LoadError message="No se pudo cargar la votación." onRetry={reload} />
      </Page>
    )
  }
  if (!matches) {
    return (
      <Page>
        <p className="text-text-muted">Cargando…</p>
      </Page>
    )
  }
  if (matches.length === 0) {
    return (
      <Page>
        <h1 className="type-display">Votar</h1>
        <p className="text-text-muted">No tienes votaciones pendientes.</p>
        <Link to="/" className="type-small text-accent-text underline">
          Volver a la plantilla
        </Link>
      </Page>
    )
  }

  const match = matches[index]
  // Fin de un partido: nadie en la fila y ninguna nota por deshacer ni por confirmar.
  const finished = stage === 'cards' && !queue.length && !undoable.length && !sending
  const phase = finished ? (index < matches.length - 1 ? 'between' : 'done') : stage

  if (phase === 'cover') {
    const [first, ...rest] = matches
    return (
      <Page>
        <Eyebrow>Votación abierta</Eyebrow>
        <h1 className="type-display text-[3.75rem] leading-[0.95] uppercase">Vota a tus compañeros</h1>
        <p className="type-small text-text-muted">
          <span className="font-semibold text-text">{matchLine(first)}</span>
          <br />
          {plural(first.pending.length, 'compañero', 'compañeros')} · cierra el {formatShortDate(first.votingClosesAt)}
          {rest.length > 0 && (
            <>
              <br />
              Después, {rest.map((m) => `${m.label} (${m.pending.length})`).join(', ')}.
            </>
          )}
        </p>
        <button type="button" onClick={() => startMatch(0)} className={primary}>
          Empezar
        </button>
      </Page>
    )
  }

  if (phase === 'between') {
    const next = matches[index + 1]
    return (
      <Page>
        <Eyebrow>{match.label} hecha</Eyebrow>
        <h1 className="type-display text-[3.75rem] leading-[0.95] uppercase">Siguiente partido</h1>
        <p className="type-small text-text-muted">
          <span className="font-semibold text-text">{matchLine(next)}</span>
          <br />
          {plural(next.pending.length, 'compañero', 'compañeros')} · cierra el {formatShortDate(next.votingClosesAt)}
        </p>
        <button type="button" onClick={() => startMatch(index + 1)} className={primary}>
          Seguir votando
        </button>
      </Page>
    )
  }

  if (phase === 'done') {
    return (
      <Page>
        <h1 className="type-display text-[3.5rem] leading-[0.95] uppercase">Has votado a todos</h1>
        <p className="type-small text-text-muted">
          Las medias se publican al cerrarse cada votación. Estas notas solo las ves tú.
        </p>
        {matches.map((m) => {
          const notes = [
            ...sent.filter((s) => s.vote.matchId === m.matchId).map((s) => [s.vote.player, s.score]),
            ...m.voted.map((v) => [v.player, v.myScore]),
          ]
          return (
            <section key={m.matchId} className="flex flex-col">
              <h2 className="type-label text-text-muted uppercase">
                {m.label} · {m.opponent} · medias el {formatShortDate(m.votingClosesAt)}
              </h2>
              {notes.map(([player, score]) => (
                <p key={player.id} className="flex items-baseline justify-between border-b border-line py-2">
                  <span className="type-name uppercase">{player.name}</span>
                  <span className="type-name text-[1.75rem] text-accent-text tabular-nums">{formatScore(score)}</span>
                </p>
              ))}
            </section>
          )
        })}
        <Link to="/" className={`${primary} grid place-items-center`}>
          Volver a la plantilla
        </Link>
      </Page>
    )
  }

  const total = match.pending.length
  const done = total - queue.length
  const last = undoable.at(-1)

  return (
    <Page>
      <div className="flex flex-col gap-2">
        <div className="flex justify-between type-label text-text-muted">
          <span>
            <b className="text-text">{match.label}</b> · {match.opponent}
          </span>
          <span>
            {Math.min(done + 1, total)} de {total}
          </span>
        </div>
        <div aria-hidden="true" className="flex gap-1">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={`h-1 flex-1 rounded-full ${i < done ? 'bg-accent' : 'bg-line'}`} />
          ))}
        </div>
      </div>

      {queue.length > 0 ? (
        <VoteCard
          key={`${queue[0].matchId}-${queue[0].player.id}`}
          vote={queue[0]}
          matchLabel={match.label}
          opponent={match.opponent}
          onAccept={accept}
          onSkip={skip}
        />
      ) : (
        <p className="py-16 text-center text-text-muted">
          Enviando tu última nota en unos segundos…
          <br />
          Aún puedes deshacerla.
        </p>
      )}

      <p role="status" className="min-h-5 text-center type-small font-semibold">
        {notice?.text}
      </p>

      {last && (
        <div
          aria-live="polite"
          // Fijo justo encima de la barra flotante (que mide 5.5rem con su hueco), para que no lo tape.
          className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 mx-auto flex max-w-md items-center justify-between gap-3 rounded-lg border border-line bg-surface py-2 pr-2 pl-4 shadow-2xl"
        >
          <span className="type-small">
            Votado <b className="text-accent-text">{formatScore(last.score)}</b> a {last.vote.player.name}
          </span>
          <button type="button" onClick={undo} className="min-h-11 px-3 type-small font-bold text-accent-text">
            Deshacer ({Math.max(1, Math.ceil((last.deadline - now) / 1000))})
          </button>
        </div>
      )}
    </Page>
  )
}

function Page({ children }) {
  return <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-4">{children}</main>
}

function Eyebrow({ children }) {
  return (
    <span className="flex items-center gap-2 type-label font-semibold tracking-widest text-accent-text uppercase">
      <span aria-hidden="true" className="size-2 rounded-full bg-accent" />
      {children}
    </span>
  )
}
