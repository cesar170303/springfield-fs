# Changelog

Registro de lo que se hace en cada feature y de los fallos detectados. Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

**Versionado (SemVer 0.x):** feature nueva → sube MINOR (`0.4.0`); arreglo o ajuste pequeño → sube PATCH (`0.3.1`). Pasará a `1.0.0` al publicar en Vercel. La versión vive en `package.json` y debe coincidir con la última entrada de este archivo.

## Fallos conocidos

Fallos detectados que aún no están resueltos. Al arreglarlos, pasa la línea a «Corregido» de la versión correspondiente.

- Sin red, la app abre con la letra de reserva y sin el icono de Google: el service worker no precarga las fuentes (`woff2`) ni los `svg` (Workbox solo incluye `js`, `css` y `html` por defecto).

## [Sin publicar]

Panel de admin, fase 3 (partidos), en curso.

### Añadido
- **Partidos** (`/admin/partidos?temporada=`): lista de la temporada con etiqueta (`J5`, `Copa J2`), fecha, rival, estado (por jugar, por terminar, votación abierta hasta el…, votación cerrada) y resultado; en los partidos por jugar, en su lugar, «Hacer convocatoria» o cuántos convocados tiene. Alta con la jornada siguiente propuesta y editor con «Datos del partido» (competición, jornada, rival, fecha, hora y resultado). La fecha se elige en un calendario que se abre al tocar el campo, con los atajos «Hoy» y «Próximo domingo»; la hora, en una lista cada 15 minutos que propone la del último partido. Un partido que aún no se ha jugado no puede tener resultado: los goles se desactivan y se explica. «Borrar partido», con confirmación, solo si no está terminado. Una jornada repetida y lo que impidan los triggers se explican con su frase. Tarjeta «Partidos», la primera del inicio del panel.
- **Convocatoria, minutos y tarjetas**, en el editor del partido: de la plantilla, quién va convocado, sus minutos (0-40) y su amarilla o roja, con el recuento («7 de 8»). Se guarda en el orden que no pierde datos (primero los convocados, luego los que salen) y, como «Datos del partido», al guardar vuelve a la lista de partidos, que lo anuncia; si algo falla, se queda en el partido con el error a la vista. Quien tiene goles o penaltis apuntados no se puede quitar, y se explica antes de guardar; lo que rechace la base de datos (un jugador con votos) llega con su frase y la lista vuelve a lo guardado.
- **Goles y penaltis fallados**, en el editor del partido y pensados para el móvil: sin desplegables, con botones grandes paso a paso («+ Gol»: quién marcó y quién asistió, dos toques; un penalti se guarda al tocarlo; «+ Penalti fallado»: quién y tipo). Goleador y asistente solo entre los convocados con minutos (el asistente nunca es el goleador y en un penalti no hay asistencia), con el recuento «3 de 4 con goleador». El marcador manda: avisa de los goles que faltan por asignar sin bloquear y, con todos apuntados, no ofrece más. Penaltis fallados con jugador y tipo. Borrar un gol o un penalti pide confirmación; lo que rechace la base de datos llega con su frase.
- **Terminar y reabrir el partido**: el bloque «Terminar partido» explica lo que falta (resultado, que ya se haya jugado, alguien con minutos), avisa de los goles sin goleador sin bloquear y de hasta cuándo estará abierta la votación (o de que ya no habrá, si pasaron 7 días); con confirmación, termina y abre la votación. Terminado, «Reabrir partido» con confirmación (con votos lo impide la base de datos, con su frase). En el inicio del panel, el aviso «N partidos por terminar».

## [0.13.0] - 2026-11-26

Paso 5 de la spec, panel de admin: jugadores, fotos, plantilla y votantes (fase 2 de 4; plan en `tasks/plan.md`, spec §12). Sin migraciones nuevas: no hace falta aplicar nada en la nube.

### Añadido
- **Fichas de jugadores** (`/admin/jugadores`): activas y archivadas aparte, con posición, correo (de `get_player_emails`, nunca de `players`), estado y si tienen cuenta. Alta y edición en su propia pantalla; archivar con confirmación en el sitio (`ConfirmButton`) y recuperar. Un correo repetido se explica.
- **Fotos de los jugadores**, en la ficha: la app recorta el centro en cuadrado y la reduce a 512 × 512 en webp (jpeg si el navegador no sabe webp), con vista previa antes de subirla. Se cambia (la vieja se borra del almacén) y se quita, con confirmación. Si algo falla a medias, la ficha nunca apunta a un archivo que no existe.
- **Plantilla y dorsales** (`/admin/plantilla?temporada=`): añadir fichas no archivadas con su dorsal (1-99), cambiarlo y quitar con confirmación; un dorsal repetido o quitar a un convocado se explican con la frase de la base de datos. Con la plantilla vacía, «Copiar la plantilla de…» trae la anterior (sin archivados, con sus dorsales) en una sola petición.
- **Votantes de la temporada** (`/admin/votantes?temporada=`): los viewers, cada uno con un interruptor «vota en 2026/27» (`season_voters`). La plantilla vota siempre y no sale en la lista. El interruptor se maneja con teclado y no pierde el foco mientras guarda.

### Cambiado
- **Inicio del panel en tarjetas con icono** (dos columnas en el móvil y tres en escritorio), en lugar de una lista de texto. «Nueva ficha» ya no queda pegado al título cuando baja de línea.

## [0.12.0] - 2026-11-23

Paso 5 de la spec, panel de admin: cimientos, temporadas y competiciones (fase 1 de 4; plan en `tasks/plan.md`, spec §12).

### Añadido
- **Ruta `/admin`**, solo para el staff (a los demás, «Esta página no existe»), y botón «Admin» en la barra. El código del panel se descarga al entrar; si falla, se avisa. Inicio del panel con selector de temporada.
- **Temporadas y competiciones** (`/admin/temporadas`): crear, editar, borrar (con confirmación y solo sin partidos) y marcar la temporada actual, con cada error en una frase (`readableError`).
- **Integridad de los votos** (migración `20261123172150`, con su test pgTAP): un partido o un jugador con votos no se borra, y el MVP a mano solo desempata. RPC `get_mvp_ties` y `set_current_season`. **Aplicada en la nube el 2026-11-24.**

### Corregido
- **Un admin que juega podía votarse a sí mismo**, y el staff elegir como votante a cualquier cuenta. Ahora la cuenta de una ficha no se cambia desde la app y solo se elige a viewers.
- Pulsar en la barra la sección en la que ya estás dejaba la plantilla en «Cargando…».

### Cambiado
- Los selectores de temporada y competición miden 44 px de alto.
- Lo que recibe el foco del teclado ya no queda detrás de la barra flotante (WCAG 2.4.11).
- `react-router` pasa a la 8.5.2 (PR de Dependabot); la navegación, comprobada.
- Fuera de «Fallos conocidos» el aviso del bundle de más de 500 kB: ya no sale (266 kB).
- Si la temporada de la URL ya no existe, la plantilla, la ficha y el panel abren por la inicial; y sin filtro si la que no existe es la competición.

## [0.11.2] - 2026-11-23

Mismo color para lo destacado en la plantilla y en la ficha, decidido por el propietario.

### Cambiado
- **Lo destacado va siempre en azul** (`accent`): la pastilla del líder de la plantilla pasa de amarillo a azul, como la cifra destacada de la ficha. El amarillo queda solo para las tarjetas amarillas y la votación.
- **Dorsales de la lista:** pastilla azul redondeada con número blanco, como la del líder, en lugar del recuadro amarillo.

### Eliminado
- Tokens `highlight` y `on-highlight`, que se quedan sin uso.

## [0.11.1] - 2026-11-23

Corrige la PWA sin red: el service worker precargaba solo los iconos.

### Corregido
- **Precarga vacía del service worker** (desde la 0.5.3): `dist/sw.js` no incluía `index.html`, el JS ni el CSS, así que la app no abría sin conexión. El `override` de `minimatch` 11 rompía `glob` 11.1.0, que pide la 10, y `glob` no encontraba ningún archivo. Ahora se fuerza `glob` 14.0.6, que ya pide `minimatch` ^11.0.5 (sin versiones de la 10 parcheadas para GHSA-g3hv-75wg-m249) y cierra además la alerta GHSA-3g3m-2fjr-6pw4 de `glob`.

### Añadido
- **El build falla** si la precarga no lleva `index.html`, JS y CSS (`scripts/require-app-shell.mjs`, en `workbox.manifestTransforms`): lo vigilan el CI, el hook `Stop` y Vercel.

## [0.11.0] - 2026-11-22

Paso 4 de la spec: la ficha del jugador, sobre la maqueta aprobada por el propietario (docs/SPEC.md §7).

### Añadido
- **Ficha del jugador** en `/jugador/:id` (`PlayerScreen`), con la temporada y la competición de la URL:
  - cabecera con foto (o iniciales), apodo, nombre real y dorsal, posición y estado, y el dorsal de fondo;
  - **medidor de media luna** con la valoración media (`RatingGauge`);
  - **seis cifras** de la temporada con su detalle (`PlayerStatCards`); al portero, goles encajados y porterías a cero;
  - **gráfica «Partido a partido»** en SVG propio (`RatingChart`): nota, media acumulada y media del equipo, con los datos de cada partido al pasar el ratón o el dedo y «Ver como tabla»;
  - **últimos partidos** (`MatchLog`) con «Ver todos los partidos» y, si la votación sigue abierta, hasta cuándo.
- **Movimiento de la ficha:** el apodo entra letra a letra (SplitText) y cada bloque sube al aparecer (ScrollTrigger), con las cifras rodando, el medidor llenándose y la gráfica dibujándose. Con «reducir movimiento», todo quieto.
- **RPC `get_player_match_log`** (migración `20261122120000`, con su test pgTAP): los partidos del jugador con minutos, goles, asistencias y, solo con la votación cerrada, nota y MVP. **Pendiente de aplicar en la nube.**
- Capas nuevas: dominio `src/domain/player.js`, port y caso de uso `getPlayerSheet`, repositorio `player-repository.js` y mappers `toRatingPoint` y `toMatchLogEntry`.

### Cambiado
- `toSquadPlayer` trae también nombre completo, estado, convocatorias, minutos, goles de penalti, partidos valorados y porterías a cero.
- Los filtros de temporada y competición se comparten entre la plantilla y la ficha (`useSeasonFilters` y `SeasonFilters`).
- `countUp` (cifras que ruedan) pasa a `motion.js` y lo usan la plantilla y la ficha.
- `CardsCount` tiene un tamaño grande para la ficha.
- Spec: §7 «Ficha del jugador y su gráfica» y la RPC nueva en §9.

## [0.10.1] - 2026-11-22

Ajuste de la barra inferior, decidido por el propietario.

### Cambiado
- **«Salir» sale de la barra** y pasa arriba a la derecha, en el marco común (`AppShell`), con icono: aparece en todas las pantallas con sesión.
- **Barra inferior:** en el móvil, solo la sección actual lleva texto (pastilla blanca); el resto, solo icono con su nombre para el lector de pantalla. Desde `md`, todas con icono y texto. Se genera desde una lista de secciones (ruta, nombre e icono), preparada para Votar, Rankings y Admin: con 5 botones mide 313 px a 360 px de ancho.
- Iconos de línea en un componente común (`Icon`).

## [0.10.0] - 2026-11-22

Navegación entre pantallas, el primer trozo del paso 4 (ADR-0004).

### Añadido
- **React Router 7** (`react-router`): la plantilla vive en `/` y la ficha en `/jugador/:id`; una dirección desconocida enseña «Esta página no existe». El «atrás» del navegador y del móvil vuelve a la pantalla anterior.
- **Barra inferior flotante** (`BottomNav`): píldora de cristal centrada, con iconos; «Plantilla» marcada como página actual en una pastilla blanca, y «Salir». Deja hueco para el notch y, a 360 px, no provoca scroll horizontal.
- Los apodos de las tarjetas de líderes y de la lista son enlaces a la ficha (`PlayerLink`).
- Ficha del jugador provisional (`PlayerScreen`), con enlace «‹ Plantilla»; su diseño está pendiente de aprobar.
- `vercel.json`: cualquier ruta sirve `index.html`, para poder recargar una ficha en Vercel.

### Cambiado
- La temporada y la competición de la plantilla se guardan en la URL (`?temporada=&competicion=`): al volver de una ficha se mantienen.
- «Salir» pasa de la cabecera de la plantilla a la barra inferior.
- Spec: §5 «Navegación» y paso 4 con la gráfica en SVG propio, en lugar de Recharts o Chart.js.

## [0.9.0] - 2026-11-21

Paso 3 de la spec: la pantalla de la plantilla con estadísticas, que sustituye al saludo provisional tras iniciar sesión.

### Añadido
- Pantalla de la plantilla (`SquadScreen`, docs/SPEC.md §5), con selector de temporada (empieza por la actual) y de competición:
  - **tarjetas de líderes** (vista inicial): Goleadores, Asistencias, Goles + asistencias, Valoración media, MVPs y Tarjetas, con el top 3 de cada una y el primero en una pastilla amarilla (token nuevo `highlight`); las cifras ruedan hasta su valor (quietas con «reducir movimiento»);
  - **lista** (botón «Mostrar como lista»): dorsal (en recuadro amarillo `highlight`), foto y apodo, agrupada por posición y por dorsal; al ordenar por goles, asistencias, valoración, MVPs, partidos o tarjetas, lista única de mayor a menor. Al portero, la columna de goles enseña los encajados.
- Capas nuevas (Clean Architecture):
  - dominio `src/domain/squad.js`: nombre (apodo o nombre), orden, grupos por posición y top 3;
  - port `src/application/ports/squad.js` y caso de uso `createSquadUseCases` (`getSquadFilters`, `getSquadStats`);
  - repositorio `src/infrastructure/supabase/squad-repository.js` (RPC `get_squad_stats`, temporadas, competiciones y URL pública de las fotos).
- Tests de cada capa: dominio, caso de uso, repositorio y pantalla.

### Cambiado
- `App.jsx`: con sesión iniciada se ve la plantilla (con «Salir»), en lugar de la pantalla provisional de saludo.
- Spec §5: nueva sección «Pantalla de la plantilla» con lo decidido sobre la maqueta.

## [0.8.0] - 2026-11-21

El formulario del login pasa a una tarjeta de cristal centrada sobre el fondo de rayitas.

### Cambiado
- `Login.jsx`: tarjeta centrada con escudo, título, campos redondeados, separador y botones en píldora; el mensaje de error va bajo los campos. Solo tokens de `src/index.css`.

### Añadido
- Icono de Google en «Continuar con Google» (`public/google.svg`, decorativo).

## [0.7.0] - 2026-11-21

Primera animación: el login estrena un fondo de rayitas que fluyen, al estilo de DeepBook. Queda lista la base para las demás animaciones.

### Añadido
- GSAP (`gsap` y `@gsap/react`) para la animación. La decisión, con las alternativas y lo que pesa, está en `docs/adr/0003-animacion-con-gsap.md`.
- `useMotion` (`src/infrastructure/ui/motion.js`): el único punto de entrada a GSAP.
  - Solo anima si el dispositivo no pide reducir movimiento.
  - Limpia las animaciones al salir de la pantalla.
- Fondo animado del login (`StripeField`), dibujado en `<canvas>` con los colores de los tokens:
  - rayitas verticales grises que suben por curvas paralelas, con destellos azules sueltos;
  - un botón para pausarlo y reanudarlo (WCAG 2.2.2);
  - con «reducir movimiento», quieto y sin botón;
  - decorativo: el lector de pantalla no lo anuncia.
- Tests:
  - `StripeField.test.jsx` comprueba que se redibuja en cada fotograma, que el botón lo pausa y lo reanuda, que con «reducir movimiento» se dibuja una sola vez, que deja de dibujar al salir y que el lector de pantalla no lo anuncia;
  - `src/test/setup.js` añade un `matchMedia` falso y un contexto de canvas falso, porque jsdom no trae ninguno de los dos.

### Cambiado
- Login: una cabecera con el fondo animado detrás del escudo y el título; el formulario va debajo, sobre negro, para que ninguna rayita quede detrás del texto pequeño.
- Spec (§11), `CLAUDE.md` y la skill `frontend-workflow`: la animación de entrada es el campo de rayitas, todas las animaciones pasan por `useMotion` y lo que se mueva más de 5 s lleva botón de pausa (WCAG 2.2.2).

## [0.6.0] - 2026-11-21

El sistema de diseño llega al código: colores, fuente y estilos de texto propios, y el login y el inicio con la dirección visual nueva.

### Añadido
- Tokens del sistema de diseño en `src/index.css` (`@theme` de Tailwind 4), tal como los describe la §11 de la spec:
  - base en negro, blanco y azul eléctrico, más los `vote-*` de la votación;
  - la paleta por defecto de Tailwind se borra, así que un color suelto (`yellow-400`) ya no genera nada.
- Fuente Archivo alojada en la propia app (`@fontsource-variable/archivo`), con sus anchos del 62 % al 125 %.
- Estilos de texto como clases: `type-display`, `type-number`, `type-name`, `type-title`, `type-body`, `type-label` y `type-small`.
- Anillo de foco único para toda la app: azul, de 2 px y separado 2 px del control.
- Configuración `dev-sin-supabase` en `.claude/launch.json`: arranca la app sin `.env`, con los valores falsos de los tests, para revisar pantallas.
- Skill `frontend-workflow` (`.claude/skills/frontend-workflow/`): la ruta de trabajo del frontend (en qué paso estamos, qué skill usar en cada etapa y dónde parar a preguntar) y las reglas del sistema de diseño, para que el agente no se desvíe.

### Corregido
- Contraste insuficiente en el login: el borde de los botones secundarios (2,7:1) y el contorno de los campos (1,2:1) no llegaban al 3:1. Ahora tienen borde en `border` (4,5:1).

### Cambiado
- Login e inicio con la dirección visual nueva: título en Archivo estrecha, botón principal azul, campos con borde, enlace en azul claro y saludo que parte los correos largos.
- `CLAUDE.md`: el frontend sigue `frontend-workflow`; la dirección visual queda decidida (negro, blanco y azul eléctrico; Donut solo en la votación; Archivo; animación con GSAP); `figma:*` se permite para diseño cuando haya un plan con escritura.
- Spec: pantalla de votación decidida con un prototipo (§6: tarjeta por compañero en orden aleatorio, nota de 1 a 10 que empieza vacía, deslizar a la derecha para votar y a la izquierda para saltar, 5 s para deshacer y datos del partido junto al apodo) y nueva §11, «Diseño visual» (colores, tipografía, movimiento y motivo).

## [0.5.3] - 2026-11-20

Corrige la alerta de Dependabot #2 (seguridad de dependencias de desarrollo).

### Corregido
- `minimatch` 10.2.6 con DoS por amplificación de patrones (GHSA-g3hv-75wg-m249 / CVE-2026-118764). Afectaba solo al build (vía `vite-plugin-pwa` → `workbox-build` → `glob`). Se fuerza `minimatch` 11.0.9 con `overrides` en `package.json`.

## [0.5.2] - 2026-11-19

Menos superficie expuesta en la API, a raíz del analizador de seguridad de Supabase en la nube.

### Cambiado
- `app_role`, `is_staff`, `is_superadmin` y `can_vote` pasan del esquema `public` al esquema `rls`: siguen funcionando para las políticas, pero ya no se pueden llamar por la API.
- `pg_net` se reinstala en el esquema `extensions` en lugar de `public`.
- Tests: `08_hardening` comprueba qué funciones quedan en la API y `09_notifications` dónde vive `pg_net`.

## [0.5.1] - 2026-11-19

Escudo en alta resolución e iconos de la PWA.

### Corregido
- **PWA no instalable:** faltaban iconos de 192 y 512 px. Ahora se generan desde `public/escudo-hd.png` (1024×1024) con `npm run icons`: 64, 192, 512, maskable, iPhone (180) y favicon, con fondo negro.
- El escudo del login y de la pantalla de inicio se veía borroso en móviles; ahora usa el de 512 px.

### Cambiado
- Spec: nombres reales de las competiciones (Primera División Liga Local y Copa); pabellón y local/visitante, decidido no añadirlos por ahora.

## [0.5.0] - 2026-11-19

Backend de las notificaciones push de la votación (falta que la PWA pida permiso y guarde la suscripción).

### Añadido
- Tres avisos por partido, cada uno una sola vez: **votación abierta** (a los votantes de la temporada), **queda 1 día** (solo a quien le falta algún compañero) y **MVP del partido** al cerrarse (a todos los registrados con notificaciones).
- `claim_pending_notifications()`: calcula los avisos pendientes y los marca como enviados en el mismo paso. Solo la puede llamar el servidor.
- Edge Function `send-push` (Web Push con VAPID): envía los avisos y borra las suscripciones caducadas.
- Tarea `pg_cron` cada 15 minutos que llama a la función; la URL y la clave se leen de Vault.
- Tests: `09_notifications` (pgTAP) y `deliver.test.ts` (Vitest).

## [0.4.1] - 2026-11-18

Auditoría de seguridad del backend y corrección de los hallazgos elegidos (`docs/security/2026-11-auditoria.md`).

### Corregido
- Cualquier usuario registrado podía leer el correo de todos los jugadores. Ahora solo el staff, con `get_player_emails()`.
- Una cuenta con el correo **sin confirmar** se quedaba con la ficha del jugador y el rol `player`. Ahora la ficha solo se vincula al confirmar el correo.
- El admin no podía cambiar ni borrar fotos de jugadores (faltaba la política de lectura en Storage).
- Borrar la cuenta de alguien que había votado cambiaba medias y MVP ya cerrados. Ahora no se puede borrar.
- Permisos sobrantes: la API ya no tiene `TRUNCATE`, `TRIGGER` ni `REFERENCES`; las funciones auxiliares no las ejecutan anónimos; eliminada `current_player_id`.

### Cambiado
- Spec: fotos públicas por URL por decisión expresa; confirmación de correo obligatoria en la nube.

## [0.4.0] - 2026-11-18

El backend gana una red de seguridad: Supabase en local, 90 tests SQL que se ejecutan con un comando (también en CI) y dos reglas nuevas de votación.

### Añadido
- Supabase local con la CLI y Docker (ADR-0002): `npm run db:start`, `db:reset`, `db:test` y `db:stop`.
- Tests pgTAP en `supabase/tests/database/`: roles, vínculo ficha↔cuenta, validaciones, votación, anonimato, estadísticas y fotos.
- Job `database` en CI que arranca Supabase y ejecuta los tests SQL.
- **Viewers votantes:** el staff elige por temporada qué viewers pueden votar (tabla `season_voters`). Su voto pesa igual y es anónimo.

### Cambiado
- **Voto definitivo:** un voto emitido ya no se puede cambiar ni borrar (antes se podía cambiar mientras la votación estaba abierta).
- `votes.voter_id` pasa a ser la cuenta del votante (`profiles.id`) en lugar de su ficha, para que voten los viewers elegidos.
- `seed.sql` crea cuentas sin contraseña para sus jugadores ficticios.

## [0.3.0] - 2026-11-16

Se añaden tests, integración continua y se reorganiza el frontend en Clean Architecture para que cada feature futura sea más fácil de probar y mantener.

### Añadido
- Tests con Vitest + React Testing Library, con cobertura mínima exigida.
- CI en GitHub Actions (lint, tests con cobertura y build en cada PR y en `main`).
- Hooks de Claude: formateo con Prettier tras cada edición y comprobación final de lint + tests + build.
- ADR-0001 con la decisión de Clean Architecture (`docs/adr/`).
- Capas `domain`, `application` e `infrastructure`; ports y casos de uso de autenticación.
- Regla de dependencia entre capas vigilada por oxlint.

### Cambiado
- Supabase y la UI migrados a `infrastructure/`; documentación actualizada.

## [0.2.0] - 2026-11-14

Paso 2 del SPEC: ya se puede iniciar sesión y la app sabe qué rol tiene cada usuario.

### Añadido
- Cliente de Supabase y variables de entorno (`.env.example`).
- Login con email y con Google.
- Contexto de sesión con el rol del usuario (`profiles.role`).

## [0.1.0] - 2026-11-14

Proyecto base.

### Añadido
- Vite + React + Tailwind CSS 4 + PWA (`vite-plugin-pwa`).
- Backend en Supabase: esquema inicial con RLS y datos de prueba (`seed.sql`, solo desarrollo).
