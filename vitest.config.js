import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Config aparte de vite.config.js a propósito: los tests no necesitan Tailwind ni el service worker de la PWA.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    // Valores falsos: src/lib/supabase.js lanza error si faltan, y los tests NUNCA deben tocar el proyecto real.
    env: {
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/main.jsx', 'src/test/**', 'src/**/*.test.{js,jsx}'],
      reporter: ['text', 'html'],
      // Suelo mínimo: puede subir, no bajar. Si una feature nueva lo hace bajar, le faltan tests.
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 70 },
    },
  },
})
