import { describe, expect, it } from 'vitest'
import { requireAppShell } from './require-app-shell.mjs'

const toEntries = (...urls) => urls.map((url) => ({ url, revision: null, size: 1 }))

const appShell = ['index.html', 'assets/index-abc.js', 'assets/index-abc.css']

describe('requireAppShell', () => {
  it('deja pasar la lista sin cambios si lleva el HTML, el JS y el CSS', () => {
    const entries = toEntries(...appShell, 'favicon.ico')

    expect(requireAppShell(entries)).toEqual({ manifest: entries })
  })

  it('falla si solo hay iconos y manifest', () => {
    expect(() => requireAppShell(toEntries('favicon.ico', 'manifest.webmanifest'))).toThrow(/index\.html.*JS.*CSS/)
  })

  it.each([
    ['index.html', 'index.html'],
    ['assets/index-abc.js', 'JS'],
    ['assets/index-abc.css', 'CSS'],
  ])('falla si falta %s', (missing, label) => {
    expect(() => requireAppShell(toEntries(...appShell.filter((url) => url !== missing)))).toThrow(label)
  })

  it('no confunde registerSW.js con el JS de la app', () => {
    expect(() => requireAppShell(toEntries('index.html', 'registerSW.js', 'assets/index-abc.css'))).toThrow('JS')
  })
})
