// Hook Stop: no deja cerrar la tarea si fallan `npm run lint`, `npm test` o `npm run build`.
// Exit 2 = bloquea y devuelve el error a Claude para que lo arregle.
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

let input = {}
try {
  input = JSON.parse(readFileSync(0, 'utf8'))
} catch {
  // sin stdin válido: seguimos igualmente con las comprobaciones
}

// Si ya estamos reintentando tras un bloqueo, no volvemos a bloquear (evita bucles infinitos).
if (input.stop_hook_active) process.exit(0)

for (const script of ['lint', 'test', 'build']) {
  const r = spawnSync('npm', ['run', script], { shell: true, encoding: 'utf8' })
  if (r.status !== 0) {
    const out = `${r.stdout ?? ''}${r.stderr ?? ''}`.split('\n').slice(-40).join('\n')
    console.error(`"npm run ${script}" ha fallado. Arréglalo antes de dar la tarea por cerrada:\n${out}`)
    process.exit(2)
  }
}
process.exit(0)
