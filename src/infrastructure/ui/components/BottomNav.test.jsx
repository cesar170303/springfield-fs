import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import BottomNav from './BottomNav'

function renderNav(url = '/') {
  const onSignOut = vi.fn()
  render(
    <MemoryRouter initialEntries={[url]}>
      <BottomNav onSignOut={onSignOut} />
    </MemoryRouter>,
  )
  return onSignOut
}

describe('BottomNav', () => {
  it('marca «Plantilla» como la página actual en la plantilla', () => {
    renderNav('/?temporada=2')

    expect(screen.getByRole('link', { name: 'Plantilla' })).toHaveAttribute('aria-current', 'page')
  })

  it('en otra pantalla, «Plantilla» no está marcada', () => {
    renderNav('/jugador/7')

    expect(screen.getByRole('link', { name: 'Plantilla' })).not.toHaveAttribute('aria-current')
  })

  it('«Salir» cierra la sesión', async () => {
    const onSignOut = renderNav()

    await userEvent.click(screen.getByRole('button', { name: 'Salir' }))

    expect(onSignOut).toHaveBeenCalledTimes(1)
  })
})
