import { describe, expect, it } from 'vitest'
import { ratingChart, smoothPath } from './chart'

describe('smoothPath', () => {
  it('pasa por todos los puntos con curvas suaves', () => {
    const d = smoothPath([
      [0, 10],
      [50, 20],
      [100, 0],
    ])

    expect(d.startsWith('M0,10')).toBe(true)
    expect(d.match(/C/g)).toHaveLength(2)
    expect(d).toContain(' 50,20C')
    expect(d.endsWith(' 100,0')).toBe(true)
  })

  it('con menos de dos puntos no hay línea', () => {
    expect(smoothPath([[5, 5]])).toBe('')
  })
})

const point = (rating, cumulativeAvg = rating, teamAvg = rating) => ({
  matchId: rating,
  label: 'J',
  opponent: 'Rival',
  rating,
  cumulativeAvg,
  teamAvg,
})
const size = { width: 328, height: 220 }

describe('ratingChart', () => {
  it('reparte los partidos a lo ancho y pone cada nota a su altura, con el 10 arriba', () => {
    const chart = ratingChart([point(10), point(7.5), point(5)], size)

    expect(chart.points.map((p) => p.x)).toEqual([28, 172, 316])
    // Escala de 4 a 10 en 180 px de alto, empezando 12 px por debajo del borde.
    expect(chart.points.map((p) => p.y)).toEqual([12, 87, 162])
  })

  it('las marcas del eje van del valor más bajo de la escala a 10', () => {
    expect(ratingChart([point(7)], size).ticks.map((t) => t.value)).toEqual([6, 7, 8, 9, 10])
  })

  it('dibuja la nota, su media y la del equipo, y el área bajo la nota', () => {
    const { paths } = ratingChart([point(7, 7, 6), point(8, 7.5, 7)], size)

    for (const key of ['rating', 'cumulative', 'team']) expect(paths[key]).toMatch(/^M[\d.]+,[\d.]+C/)
    expect(paths.area.startsWith(paths.rating)).toBe(true)
    expect(paths.area.endsWith('Z')).toBe(true)
  })

  it('un solo partido queda en el centro, sin línea', () => {
    const chart = ratingChart([point(8)], size)

    expect(chart.points[0].x).toBe(172)
    expect(chart.paths.rating).toBe('')
    expect(chart.paths.area).toBe('')
  })

  it('con muchos partidos solo pone etiqueta a algunos, y siempre al último', () => {
    const chart = ratingChart(
      Array.from({ length: 20 }, () => point(7)),
      size,
    )

    expect(chart.points.filter((p) => p.showLabel).length).toBeLessThan(20)
    expect(chart.points.at(-1).showLabel).toBe(true)
  })

  it('elige el partido más cercano a una posición horizontal', () => {
    const chart = ratingChart([point(7), point(8), point(9)], size)

    expect(chart.nearest(0)).toBe(0)
    expect(chart.nearest(180)).toBe(1)
    expect(chart.nearest(9999)).toBe(2)
  })
})
