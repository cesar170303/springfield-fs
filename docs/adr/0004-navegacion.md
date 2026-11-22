# ADR-0004: Navegación con React Router y barra inferior

**Estado:** Aceptado (2026-11-22)
**Decisores:** Propietario del proyecto

## Contexto

Hasta el paso 3, `App.jsx` solo elegía entre el login y la plantilla. El paso 4 (la ficha del jugador) abre una pantalla nueva, y después llegarán la votación, los rankings y el panel de admin. En el móvil, el botón «atrás» tiene que volver a la pantalla anterior, no cerrar la app, y una ficha se tiene que poder compartir con un enlace.

## Decisión

- **React Router 7** (`react-router`), en modo declarativo: `BrowserRouter` en `main.jsx`, y `Routes` en `App.jsx`.
- **URLs reales:** `/` es la plantilla y `/jugador/:playerId` la ficha. Una dirección desconocida enseña «Esta página no existe». Sin sesión, cualquier dirección enseña el login.
- **Los filtros viven en la URL:** `?temporada=&competicion=`. Al volver de una ficha, la plantilla sigue con los mismos filtros, y la ficha sabe qué temporada enseñar. Cambiar un filtro reemplaza la entrada del historial (no suma pasos al «atrás»).
- **Barra inferior flotante** (`BottomNav`), una píldora de cristal centrada con iconos y la pantalla actual en una pastilla blanca (referencia del propietario, 2026-11-22), dentro de un marco común (`AppShell` en `App.jsx`).
  - Se genera desde una lista de secciones (ruta, nombre e icono). Hoy solo tiene «Plantilla»; crecerá con Votar, Rankings y Admin (este, solo visible para el staff; la seguridad sigue siendo RLS).
  - En el móvil, solo la sección actual lleva texto; el resto, solo icono con su nombre accesible (texto `sr-only`). Desde `md`, todas con texto. Así caben 4 o 5 secciones a 360 px.
  - Es solo para navegar: **«Salir» va arriba a la derecha**, en `AppShell`, en todas las pantallas con sesión.
- **La ficha, a pantalla completa**, con un enlace «‹ Plantilla» que conserva los filtros.
- Los jugadores se abren con enlaces reales (`PlayerLink`), no con `onClick`: funcionan con teclado, con lector de pantalla y para abrir en otra pestaña.
- **Vercel:** `vercel.json` reescribe cualquier ruta a `index.html`, para que recargar `/jugador/12` no dé 404. El service worker de la PWA (`generateSW`) ya responde a las navegaciones con `index.html`.

## Alternativas descartadas

- **Router propio con la History API:** sin dependencia, pero tocaría mantener nosotros parámetros, enlaces activos y casos raros.
- **Solo estado de React:** lo más simple, pero el «atrás» del móvil cerraría la app y no habría enlaces a una ficha.
- **Ficha en una hoja que sube desde abajo:** queda apretada para la gráfica y el scroll largo, y sería una animación nueva.

## Consecuencias

- Una dependencia más (~15 kB comprimida).
- Los tests de componentes que usan enlaces se montan dentro de `MemoryRouter` (con `initialEntries` para elegir la URL).
- La UI sigue llamando solo a casos de uso (ADR-0001): React Router es infraestructura de la UI y no entra en `domain/` ni `application/`.
