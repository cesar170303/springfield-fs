// Arranca Vite contra el Supabase LOCAL (antes: npm run db:start y, para tener datos, npm run db:reset).
// La URL y la clave anónima se leen de `supabase status`: así no se guarda ninguna clave en el repo.
// Las variables del proceso mandan sobre las de .env (regla de Vite), así que este servidor nunca toca la nube.
import { execSync, spawn } from 'node:child_process'

const status = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8' }))
const env = { ...process.env, VITE_SUPABASE_URL: status.API_URL, VITE_SUPABASE_ANON_KEY: status.ANON_KEY }

// PORT: el que asigna la vista previa si el 5175 está ocupado.
const port = Number(process.env.PORT) || 5175
spawn(`npx vite --port ${port} --strictPort`, { stdio: 'inherit', env, shell: true })
