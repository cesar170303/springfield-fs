// Hook PostToolUse (Edit|Write): formatea con Prettier el archivo recién editado.
// Nunca bloquea: si algo falla, sale con 0 para no interrumpir el trabajo.
import { readFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { basename, extname } from 'node:path'

try {
  const input = JSON.parse(readFileSync(0, 'utf8'))
  const file = input.tool_response?.filePath ?? input.tool_input?.file_path
  const formattable = ['.js', '.jsx', '.mjs', '.json', '.css', '.html']

  // Nunca tocar .env*; solo extensiones que Prettier maneja bien en este proyecto.
  if (file && existsSync(file) && !basename(file).startsWith('.env') && formattable.includes(extname(file))) {
    spawnSync('npx', ['prettier', '--write', '--ignore-unknown', file], { shell: true, stdio: 'ignore' })
  }
} catch {
  // silencioso a propósito
}
process.exit(0)
