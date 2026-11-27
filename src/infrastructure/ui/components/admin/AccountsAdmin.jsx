import { useState } from 'react'
import { roleWithoutAdmin } from '../../../../domain/user'
import { useAsync } from '../../use-async'
import { useUseCases } from '../../use-cases-context'
import Icon from '../Icon'
import AdminPage from './AdminPage'
import ConfirmButton from './ConfirmButton'
import LoadError from './LoadError'
import { dangerButton, primaryButton } from './styles'

const ROLE = { superadmin: 'Superadmin', admin: 'Admin', player: 'Jugador', viewer: 'Viewer' }

// Clases enteras para que Tailwind las genere.
const PILL = {
  superadmin: 'bg-accent text-on-accent',
  admin: 'bg-accent text-on-accent',
  player: 'bg-line text-text',
  viewer: 'bg-line text-text',
}

/**
 * Usuarios y roles (docs/SPEC.md §12), solo para el superadmin: «Hacer admin» y «Quitar admin» (vuelve a jugador si
 * tiene ficha; si no, a viewer), con confirmación. Ni la propia cuenta ni la de otro superadmin tienen botones. Los
 * permisos reales los da RLS: solo el superadmin puede cambiar roles.
 */
export default function AccountsAdmin({ currentUserId }) {
  const { listAccounts, makeAdmin, removeAdmin } = useUseCases()
  const { data: accounts, error, reload } = useAsync(() => listAccounts(currentUserId), currentUserId)
  const [ok, setOk] = useState('')

  async function change(action, message) {
    setOk('')
    await action() // si falla, ConfirmButton enseña la frase
    setOk(message)
    reload()
  }

  return (
    <AdminPage title="Usuarios">
      <p className="type-body text-text-muted">
        Un admin gestiona todo el panel. Solo el superadmin puede hacer o quitar admins.
      </p>
      {error && <LoadError message={error.message} onRetry={reload} />}
      {!accounts && !error && <p className="text-text-muted">Cargando…</p>}
      <p role="status" className="type-small text-text-muted empty:sr-only">
        {ok}
      </p>
      <ul className="grid md:grid-cols-2 md:gap-x-8">
        {accounts?.map((a) => (
          <li key={a.id} className="flex flex-col gap-2 border-t border-line py-3">
            <div className="flex items-start justify-between gap-3">
              <span className="flex min-w-0 flex-col">
                <span className="type-body font-semibold">{a.name}</span>{' '}
                <span className="truncate type-small text-text-muted">{a.email}</span>
              </span>{' '}
              <span className="flex shrink-0 flex-col items-end gap-1">
                <span className={`rounded-full px-3 py-0.5 type-small font-semibold ${PILL[a.role]}`}>
                  {ROLE[a.role]}
                </span>{' '}
                {a.player && (
                  <span className="flex items-center gap-1 type-small text-text-muted">
                    <Icon name="shirt" className="size-4 shrink-0" />
                    <span className="sr-only">Ficha: </span>
                    {a.player}
                  </span>
                )}
              </span>
            </div>
            {a.canChange &&
              (a.role === 'admin' ? (
                <ConfirmButton
                  label="Quitar admin"
                  question={`¿Quitar el admin a ${a.name}? Vuelve a ${ROLE[roleWithoutAdmin({ hasPlayer: Boolean(a.player) })].toLowerCase()}.`}
                  confirmLabel="Sí, quitar admin"
                  onConfirm={() => change(() => removeAdmin(a), `${a.name} ya no es admin.`)}
                  className={dangerButton}
                />
              ) : (
                <ConfirmButton
                  label="Hacer admin"
                  question={`¿Hacer admin a ${a.name}? Podrá gestionar todo el panel.`}
                  confirmLabel="Sí, hacer admin"
                  onConfirm={() => change(() => makeAdmin(a.id), `${a.name} ya es admin.`)}
                  className={primaryButton}
                />
              ))}
          </li>
        ))}
      </ul>
    </AdminPage>
  )
}
