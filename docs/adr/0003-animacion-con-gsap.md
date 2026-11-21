# ADR-0003: Animación con GSAP

**Estado:** Aceptado (2026-11-21)
**Decisores:** Propietario del proyecto

## Contexto

La dirección visual (`docs/SPEC.md` §11) pide mucho movimiento, al estilo de las referencias (DeepBook y Kopetzki). Son cinco animaciones:

- las rayas del escudo en la entrada: un campo de rayitas que fluyen, como el de DeepBook;
- los titulares, letra a letra;
- las cifras, que ruedan hasta su valor;
- la ficha, que avanza con el scroll;
- la tarjeta de votación, que sigue al dedo.

Con CSS solo se hacen bien las transiciones sencillas. Aquí hacen falta secuencias, animación ligada al scroll, partir un texto en letras, dibujar la gráfica y seguir el dedo. Además, todo tiene que quedarse quieto si el dispositivo pide reducir movimiento.

## Decisión

- **GSAP** (`gsap` 3.x) con **`@gsap/react`**: su hook `useGSAP` guarda cada animación en un contexto y la limpia sola al desmontar el componente.
- Los plugins que pide la spec vienen en el mismo paquete y son gratuitos: ScrollTrigger (la ficha), SplitText (los titulares) y DrawSVG (la gráfica). Cada uno se registra cuando una pantalla lo use, no antes.
- **Un único punto de entrada:** `src/infrastructure/ui/motion.js`.
  - Registra `useGSAP` y exporta `gsap`.
  - Ofrece `useMotion`, que crea las animaciones dentro de `gsap.matchMedia()` con la consulta `(prefers-reduced-motion: no-preference)`.
  - Con «reducir movimiento» no se crea ninguna animación, y todo queda quieto en su estado final.
  - Los componentes no importan `gsap` ni `@gsap/react` directamente.
- Solo se animan `transform` y `opacity` de los elementos de la página.
- **Muchas piezas, en `<canvas>`:** el campo de rayitas del login (cientos de piezas) se dibuja en un `<canvas>` 2D, y el ritmo lo marca `gsap.ticker`. Es más barato que mover cientos de elementos y no recalcula la maqueta de la página.
- **Más de 5 s, con botón de pausa:** lo que se mueva más de 5 s seguidos junto a otro contenido lleva un botón para pararlo (WCAG 2.2.2, «Pausar, detener u ocultar»). El campo de rayitas del login lo tiene.
- **Sin Lenis** ni scroll suavizado: en el móvil, el scroll nativo.

## Opciones consideradas

| Opción | A favor | En contra |
|---|---|---|
| **GSAP + @gsap/react (elegida)** | Secuencias, scroll, texto letra a letra y dibujo de SVG en una sola librería. `matchMedia` resuelve lo de reducir movimiento. Gratuita desde 2025, también para uso comercial. | Licencia propia, no de código abierto. Suma peso al bundle (ver «Consecuencias»). |
| Motion (antes Framer Motion) | Muy integrada con React y con licencia MIT | Los efectos de las referencias habría que reconstruirlos con otras piezas |
| CSS y la Web Animations API | Ninguna dependencia | Sin scroll ligado ni texto partido en letras: mucho código propio para cinco animaciones |
| Lenis (scroll suavizado) | Da el scroll «de web premiada» de las referencias | En una PWA móvil cambia la sensación del scroll nativo; otra dependencia más |

## Consecuencias

- La licencia es la estándar de GSAP («no charge», <https://gsap.com/standard-license>): sin coste, pero no es MIT.
- **Peso:** GSAP añade 72 kB al JS (28 kB comprimido). El bundle pasa de 441 a 513 kB y supera el aviso de 500 kB de Vite. Cuando haya pantallas reales, se valorará partirlo en trozos (*code splitting*) con `performance-optimization`.
- jsdom, el navegador falso de los tests, no trae `window.matchMedia` (GSAP lo necesita) ni dibuja en `<canvas>`. Por eso `src/test/setup.js` añade dos cosas:
  - un `matchMedia` en el que no coincide ninguna consulta, así que en los tests no se anima nada salvo que el test lo pida con `vi.stubGlobal`;
  - un contexto 2D de canvas que acepta cualquier llamada y no hace nada.
- Una animación que no sea una de las cinco aprobadas se pregunta antes (skill `frontend-workflow`).
- GSAP 4 está en beta (noviembre de 2026). Seguimos en la 3.x hasta que sea estable, y cambiar de versión mayor será un paso aparte.
