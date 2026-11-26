import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import PlayerForm from './PlayerForm'
import { UseCasesContext } from '../../use-cases-context'

const CHECO = {
  id: 3,
  firstName: 'Sergio',
  lastName: 'López',
  nickname: 'Checo',
  email: 'sergio@example.com',
  position: 'winger',
  status: 'injured',
  photoUrl: null,
  hasAccount: false,
  archived: false,
}

// La lista, adonde vuelve la ficha al terminar: enseña la URL y lo que se le anuncia.
function List() {
  const { pathname, search, state } = useLocation()
  return (
    <p>
      Lista en {pathname + search}: {state?.ok}
    </p>
  )
}

function renderForm(url, overrides = {}) {
  const useCases = {
    listPlayers: vi
      .fn()
      .mockResolvedValue([CHECO, { ...CHECO, id: 4, nickname: 'Navi', archived: true, hasAccount: true }]),
    savePlayer: vi.fn().mockResolvedValue(3),
    archivePlayer: vi.fn().mockResolvedValue(),
    restorePlayer: vi.fn().mockResolvedValue(),
    ...overrides,
  }
  render(
    <UseCasesContext.Provider value={useCases}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/admin/jugadores" element={<List />} />
          <Route path="/admin/jugadores/nuevo" element={<PlayerForm />} />
          <Route path="/admin/jugadores/:playerId" element={<PlayerForm />} />
        </Routes>
      </MemoryRouter>
    </UseCasesContext.Provider>,
  )
  return useCases
}

describe('PlayerForm', () => {
  it('crea una ficha con correo y vuelve a la lista, que lo anuncia', async () => {
    const useCases = renderForm('/admin/jugadores/nuevo?temporada=2')

    expect(screen.getByRole('heading', { name: 'Nueva ficha' })).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Nombre'), 'Javier')
    await userEvent.type(screen.getByLabelText('Apellidos'), 'Ruiz')
    await userEvent.type(screen.getByLabelText('Apodo (opcional)'), 'Javi')
    await userEvent.type(screen.getByLabelText('Correo (opcional)'), 'javier@example.com')
    await userEvent.selectOptions(screen.getByLabelText('Posición'), 'Pívot')
    expect(screen.getByLabelText('Estado')).toHaveValue('available')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(useCases.savePlayer).toHaveBeenCalledWith({
      firstName: 'Javier',
      lastName: 'Ruiz',
      nickname: 'Javi',
      email: 'javier@example.com',
      position: 'pivot',
      status: 'available',
    })
    expect(await screen.findByText('Lista en /admin/jugadores?temporada=2: Ficha guardada.')).toBeInTheDocument()
  })

  it('edita una ficha con sus datos ya puestos y dice que aún no tiene cuenta', async () => {
    const useCases = renderForm('/admin/jugadores/3')

    expect(await screen.findByRole('heading', { name: 'Checo' })).toBeInTheDocument()
    expect(screen.getByLabelText('Correo (opcional)')).toHaveValue('sergio@example.com')
    expect(screen.getByLabelText('Estado')).toHaveValue('injured')
    expect(
      screen.getByText('Sin cuenta. Se vinculará cuando se registre con ese correo y lo confirme.'),
    ).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('Estado'), 'Disponible')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(useCases.savePlayer).toHaveBeenCalledWith(expect.objectContaining({ id: 3, status: 'available' }))
  })

  it('un correo repetido se explica y no se pierde lo escrito', async () => {
    renderForm('/admin/jugadores/3', {
      savePlayer: vi.fn().mockRejectedValue(new Error('Ya hay una ficha con ese correo.')),
    })

    await userEvent.clear(await screen.findByLabelText('Correo (opcional)'))
    await userEvent.type(screen.getByLabelText('Correo (opcional)'), 'daniel@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Ya hay una ficha con ese correo.')
    expect(screen.getByLabelText('Correo (opcional)')).toHaveValue('daniel@example.com')
  })

  it('archiva con confirmación y vuelve a la lista', async () => {
    const useCases = renderForm('/admin/jugadores/3')

    await userEvent.click(await screen.findByRole('button', { name: 'Archivar' }))
    expect(
      screen.getByText('¿Archivar a Checo? Conserva su historial y deja de salir en temporadas nuevas.'),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sí, archivar' }))

    expect(useCases.archivePlayer).toHaveBeenCalledWith(3)
    expect(await screen.findByText('Lista en /admin/jugadores: Checo, archivado.')).toBeInTheDocument()
  })

  it('una ficha archivada se recupera y dice que tiene cuenta', async () => {
    const useCases = renderForm('/admin/jugadores/4')

    expect(await screen.findByText('Con cuenta vinculada.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Archivar' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Recuperar' }))

    expect(useCases.restorePlayer).toHaveBeenCalledWith(4)
    expect(await screen.findByText('Lista en /admin/jugadores: Navi, recuperado.')).toBeInTheDocument()
  })

  it('si no se puede recuperar, lo explica', async () => {
    renderForm('/admin/jugadores/4', {
      restorePlayer: vi.fn().mockRejectedValue(new Error('No se pudo recuperar la ficha.')),
    })

    await userEvent.click(await screen.findByRole('button', { name: 'Recuperar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo recuperar la ficha.')
  })

  it('«Cancelar» vuelve a la lista sin guardar', async () => {
    const useCases = renderForm('/admin/jugadores/nuevo?temporada=2')

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(await screen.findByText(/Lista en \/admin\/jugadores\?temporada=2/)).toBeInTheDocument()
    expect(useCases.savePlayer).not.toHaveBeenCalled()
  })

  it('una ficha que no existe lo dice', async () => {
    renderForm('/admin/jugadores/99')

    expect(await screen.findByText('Esta ficha no existe.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a jugadores' })).toHaveAttribute('href', '/admin/jugadores')
  })

  it('si no se puede cargar, lo dice y deja reintentar', async () => {
    renderForm('/admin/jugadores/3', {
      listPlayers: vi.fn().mockRejectedValueOnce(new Error('No se pudieron cargar.')).mockResolvedValue([CHECO]),
    })

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar.')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('heading', { name: 'Checo' })).toBeInTheDocument()
  })
})
