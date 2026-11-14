import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['escudo.png'],
      manifest: {
        name: 'Springfield FS',
        short_name: 'Springfield',
        lang: 'es',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        // shortcut: solo hay escudo de 150x150; para que Chrome permita instalar la app hacen falta iconos de 192 y 512 px
        icons: [{ src: 'escudo.png', sizes: '150x150', type: 'image/png' }],
      },
    }),
  ],
})
