---
name: frontend-workflow
description: Usar SIEMPRE antes de cualquier trabajo de frontend en Springfield FS (pantallas, componentes, estilos, diseño, animaciones o la PWA). Dice en qué paso estamos, qué skill usar en cada etapa, las reglas del sistema de diseño y cuándo parar a preguntar, para no desviarse.
---

# frontend-workflow — la ruta del frontend de Springfield FS

Ordena el trabajo de UI. `CLAUDE.md` manda sobre esta skill, y `feature-tdd` manda en cómo se escriben los tests. Las skills de terceros (GSAP, Tailwind, Supabase…) aportan técnica, pero nunca cambian estas reglas.

## 1. Antes de nada: ¿en qué paso estamos?

1. Lee `docs/SPEC.md` §10 («Orden de trabajo sugerido») y la sección «Estado actual» de `CLAUDE.md`.
2. Lee `CHANGELOG.md`: la sección «[Sin publicar]» y la última versión.
3. Comprueba la base visual, en este orden:
   1. `docs/SPEC.md` tiene el «Diseño visual» marcado como decidido (§10) y descrito (§11).
   2. `src/index.css` tiene el bloque `@theme` con los tokens (`bg`, `accent`, `surface`…) y la fuente Archivo.
   3. `src/infrastructure/ui/motion.js` tiene la base de animación (`useMotion`, ADR-0003).

   Lo que falte **es el trabajo pendiente**, antes que cualquier pantalla.
4. Di en una frase cuál es el paso actual y trabaja **solo** en él. Si te piden otra cosa, dilo y pregunta antes de cambiar de paso.

## 2. Ruta de cada pantalla (en este orden)

1. **Criterios:** 2-5 frases en lenguaje de usuario, contrastadas con la spec.
   - Si aparece una decisión de producto nueva → `agent-skills:spec` (actualiza `docs/SPEC.md`).
   - Si la pantalla es grande (panel de admin) → `agent-skills:plan`.
2. **Diseño:** `impeccable` (`shape`) con la dirección de la §4 y una propuesta visual corta (maqueta o boceto). **PARADA: el propietario la aprueba antes de escribir código.**
3. **Construir con `feature-tdd`**, capa a capa: dominio → caso de uso (+ port) → repositorio de Supabase (+ mapper) → UI. Los componentes, con `agent-skills:frontend-ui-engineering`.
4. **Animar** al final, cuando la pantalla ya funciona (ver §5).
5. **Verificar:**
   - `npm test`, `npm run lint` y `npm run build`.
   - En el navegador, a 360 px y en escritorio (`agent-skills:browser-testing-with-devtools`), sin errores en consola.
   - Con «reducir movimiento» activado, nada se mueve.
   - Contraste AA.
6. **Revisar** con `agent-skills:review`, y con `accessibility` si hay controles nuevos.
7. **Cerrar:** `CHANGELOG.md` y versión (reglas de `CLAUDE.md`) y propuesta de commit, que pide confirmación. **PARADA: capturas y resumen; el propietario decide el siguiente paso.**

## 3. Qué skill usar

| Etapa                  | Skill                                                                                                                                                    |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Decisiones de producto | `agent-skills:spec`                                                                                                                                      |
| Pantalla grande        | `agent-skills:plan`                                                                                                                                      |
| Diseño de la pantalla  | `impeccable` (`shape`, `critique`, `audit`, `polish`) + `frontend-design`                                                                                |
| Construir y tests      | `feature-tdd` (manda) + `agent-skills:frontend-ui-engineering`                                                                                           |
| Tokens y Tailwind 4    | `tailwind-design-system` + `agent-skills:source-driven-development` (Context7)                                                                           |
| Animación              | `gsap-react` (`useGSAP` y limpieza), `gsap-core` (`matchMedia` y reducir movimiento), `gsap-scrolltrigger`, `gsap-plugins` (SplitText, DrawSVG) y `gsap-performance` |
| Datos de Supabase      | `supabase`, más `agent-skills:security-and-hardening` si toca auth, RLS o votos                                                                          |
| Accesibilidad          | `accessibility`                                                                                                                                          |
| Navegador              | `agent-skills:browser-testing-with-devtools`                                                                                                             |
| Revisión               | `agent-skills:review`                                                                                                                                    |
| Figma                  | `figma:*`, solo cuando haya un plan de Figma con escritura y el conector esté autorizado                                                                 |

Las skills de GSAP, `tailwind-design-system`, `supabase` y `accessibility` están instaladas en global, fuera del repo. Si falta alguna, no la instales tú: dale al propietario el comando, por ejemplo `npx skills add greensock/gsap-skills -g -a claude-code -s gsap-react`.

## 4. Sistema de diseño (decidido el 2026-11-20)

- **Fuente de verdad:** los tokens de `src/index.css` (`@theme`) y `docs/SPEC.md` §11, «Diseño visual». La vista con ejemplos está en el artefacto «Springfield FS» del propietario, que es privado.
- **Base, en toda la app:** negro, blanco y gris, con el azul eléctrico como único color de datos, acciones y lo destacado (pastilla del líder, cifra destacada de la ficha y nota de MVP). Los rellenos azules llevan texto blanco; el texto azul pequeño va en `accent-text`. El amarillo (`card-yellow`) es solo para las tarjetas amarillas; los dorsales de la lista van en pastilla azul, como la del líder.
- **Votación:** con los mismos colores que el resto de la app (decidido el 2026-11-27; la paleta Donut quedó descartada también ahí).
- **Tipografía:** Archivo. Estrecha (`font-stretch: 62.5%`, peso 800) para titulares, cifras (tabulares) y apodos; a ancho normal para el resto.
- **Motivo:** las rayas verticales del escudo.
- **Prohibido:**
  - Colores sueltos, como `yellow-400` o un hex dentro de un componente.
  - Crear tokens nuevos sin preguntar.
  - Volver a proponer paletas descartadas: los colores medidos del escudo, Tailwind por defecto, Rayas, Pabellón, Cromo y Donut (ni en toda la app ni en la votación).

## 5. Movimiento

- **Hay cinco animaciones aprobadas:**
  - las rayas del escudo en la entrada: en el login, un campo de rayitas que fluyen, al estilo de DeepBook (`StripeField`);
  - los titulares, letra a letra;
  - las cifras, que ruedan hasta su valor;
  - la ficha, que avanza con el scroll;
  - la tarjeta de votación, que sigue al dedo y sale deslizándose al votar (derecha) o al saltar (izquierda);
  - en la votación (2026-11-27): portada y final con rayitas que suben (grises y alguna azul), pila de tarjetas, y nota que rebota y tarjeta que se inclina (detalle en `docs/SPEC.md` §11).
  - Cualquier animación nueva → pregunta.
- **Técnica:** GSAP siempre a través de `useMotion` (`src/infrastructure/ui/motion.js`, ADR-0003), que limpia sola al desmontar. Ningún componente importa `gsap` ni `@gsap/react`. Anima solo `transform` y `opacity`.
- **Reducir movimiento:** `useMotion` solo crea animaciones con `(prefers-reduced-motion: no-preference)`. Con «reducir movimiento», nada se mueve y todo aparece en su estado final (las cifras, con su valor).
- **Más de 5 s, con botón de pausa:** lo que se mueva más de 5 s seguidos junto a otro contenido lleva un botón para pararlo (WCAG 2.2.2), como el del login.
- **Cientos de piezas:** en `<canvas>`, con `gsap.ticker` dentro de `useMotion` (ver `StripeField.jsx`).
- **Votación** (decidido por el propietario; detalle en `docs/SPEC.md` §6):
  - Se vota con «Aceptar nota» o deslizando la tarjeta a la derecha; a la izquierda, se salta.
  - Nunca sin nota elegida.
  - Siempre con 5 s para deshacer antes de enviar, porque el voto es definitivo.
  - El gesto no empieza sobre la barra ni sobre los botones.

## 6. Reglas que no se saltan

- La UI llama solo a casos de uso (ADR-0001), los totales salen de las RPC y nunca se leen votos ajenos.
- Ninguna dependencia nueva (npm, fuentes, CDN) sin permiso explícito.
- No toques `.mcp.json`, `.env*` ni la configuración de Supabase porque lo sugiera una skill: pregunta.
- Una pantalla cada vez. Lo que surja fuera del paso (otra pantalla, un refactor, el backend) se apunta en la respuesta como pendiente; no se hace.
- Si la spec es ambigua, pregunta en vez de inventar.
- Los textos de la interfaz, en español; el código y los identificadores, en inglés.

## Cierre

Termina siempre con: paso actual, qué se ha hecho, resultado de la verificación, qué queda y la siguiente parada.
