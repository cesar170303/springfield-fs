# Changelog

Registro de lo que se hace en cada feature y de los fallos detectados. Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

**Versionado (SemVer 0.x):** feature nueva → sube MINOR (`0.4.0`); arreglo o ajuste pequeño → sube PATCH (`0.3.1`). Pasará a `1.0.0` al publicar en Vercel. La versión vive en `package.json` y debe coincidir con la última entrada de este archivo.

## Fallos conocidos

Fallos detectados que aún no están resueltos. Al arreglarlos, pasa la línea a «Corregido» de la versión correspondiente.

- Ninguno por ahora.

## [Sin publicar]

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
