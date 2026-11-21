import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Sin `globals: true`, Testing Library no limpia solo el DOM entre tests: lo hacemos aquí.
afterEach(cleanup)

// jsdom no trae window.matchMedia, y gsap.matchMedia() lo usa (ADR-0003). Aquí no coincide ninguna consulta,
// así que los tests no animan nada; los tests de animación cambian la respuesta con vi.stubGlobal.
window.matchMedia ??= (query) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} })

// jsdom no dibuja en <canvas> (avisa «Not implemented»): un contexto 2D que acepta cualquier llamada y no hace nada.
const fake2d = new Proxy(() => fake2d, { get: () => fake2d, set: () => true, apply: () => fake2d })
HTMLCanvasElement.prototype.getContext = () => fake2d
