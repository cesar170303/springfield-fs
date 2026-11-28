import { describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import BottomNav from './BottomNav'

function renderNav(url = '/', staff = false, pendingVotes = 0) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <BottomNav staff={staff} pendingVotes={pendingVotes} />
    </MemoryRouter>,
  )
  return screen.getByRole('navigation', { name: 'Principal' })
}

describe('BottomNav', () => {
  it('marca «Plantilla» como la página actual en la plantilla', () => {
    renderNav('/?temporada=2')

    expect(screen.getByRole('link', { name: 'Plantilla' })).toHaveAttribute('aria-current', 'page')
  })

  it('en otra pantalla, «Plantilla» no está marcada y conserva su nombre para el lector de pantalla', () => {
    renderNav('/jugador/7')

    const link = screen.getByRole('link', { name: 'Plantilla' })
    expect(link).not.toHaveAttribute('aria-current')
    expect(link).toHaveAttribute('href', '/')
  })

  it('los iconos son decorativos: el lector de pantalla solo lee el nombre', () => {
    const nav = renderNav()

    for (const svg of nav.querySelectorAll('svg')) expect(svg).toHaveAttribute('aria-hidden', 'true')
  })

  it('no lleva «Salir»: la barra es solo para navegar', () => {
    const nav = renderNav()

    expect(within(nav).queryByRole('button')).not.toBeInTheDocument()
  })

  it('enseña «Votar» a todos, que lleva a la votación', () => {
    renderNav('/votar')

    const link = screen.getByRole('link', { name: 'Votar' })
    expect(link).toHaveAttribute('href', '/votar')
    expect(link).toHaveAttribute('aria-current', 'page')
  })

  it('con votos pendientes, «Votar» lleva un punto y lo dice al lector de pantalla', () => {
    const nav = renderNav('/', false, 3)

    expect(within(nav).getByRole('link', { name: 'Votar (tienes votos pendientes)' })).toBeInTheDocument()
    expect(nav.querySelector('[data-pending-dot]')).toBeInTheDocument()
  })

  it('sin votos pendientes, no hay punto', () => {
    const nav = renderNav('/', false, 0)

    expect(nav.querySelector('[data-pending-dot]')).not.toBeInTheDocument()
  })

  it('enseña «Admin» solo al staff', () => {
    const nav = renderNav('/', false)
    expect(within(nav).queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument()

    cleanup()
    renderNav('/', true)
    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin')
  })

  it('marca «Admin» como la página actual en todo el panel, y «Plantilla» no', () => {
    renderNav('/admin/partidos', true)

    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Plantilla' })).not.toHaveAttribute('aria-current')
  })
})
