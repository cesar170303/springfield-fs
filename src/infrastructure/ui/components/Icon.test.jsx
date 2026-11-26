import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import Icon from './Icon'

describe('Icon', () => {
  it('es decorativo y, sin más, mide lo de la barra inferior', () => {
    const { container } = render(<Icon name="admin" />)

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('svg')).toHaveClass('size-4')
  })

  it('con className, cambia de tamaño (las tarjetas del panel)', () => {
    const { container } = render(<Icon name="calendar" className="size-7" />)

    expect(container.querySelector('svg')).toHaveClass('size-7')
    expect(container.querySelector('svg')).not.toHaveClass('size-4')
    expect(container.querySelector('svg').children.length).toBeGreaterThan(0)
  })

  it.each(['players', 'shirt', 'vote', 'ball'])('tiene el icono %s', (name) => {
    const { container } = render(<Icon name={name} />)

    expect(container.querySelector('svg').children.length).toBeGreaterThan(0)
  })
})
