import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Iconos de la PWA a partir del escudo en alta resolución: `npm run icons`.
// Fondo negro (el del club) en lugar del blanco por defecto en los iconos con margen.
const black = { background: '#000000' }

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: black },
    apple: { ...minimal2023Preset.apple, resizeOptions: black },
  },
  images: ['public/escudo-hd.png'],
})
