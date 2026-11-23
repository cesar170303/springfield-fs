// Transformación de Workbox (`manifestTransforms`): hace fallar el build si la precarga no lleva la app.
// `/assets/` excluye a registerSW.js, que no es la app.
const REQUIRED = [
  ['index.html', /^index\.html$/],
  ['JS', /^assets\/.+\.js$/],
  ['CSS', /^assets\/.+\.css$/],
]

export function requireAppShell(entries) {
  const missing = REQUIRED.filter(([, pattern]) => !entries.some(({ url }) => pattern.test(url))).map(
    ([label]) => label,
  )
  if (missing.length > 0) {
    throw new Error(`La precarga del service worker no incluye: ${missing.join(', ')}. Sin eso la PWA no abre sin red.`)
  }
  return { manifest: entries }
}
