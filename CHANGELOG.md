# Changelog

Registro de lo que se hace en cada feature y de los fallos detectados. Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

**Versionado (SemVer 0.x):** feature nueva → sube MINOR (`0.4.0`); arreglo o ajuste pequeño → sube PATCH (`0.3.1`). Pasará a `1.0.0` al publicar en Vercel. La versión vive en `package.json` y debe coincidir con la última entrada de este archivo.

## Fallos conocidos

Fallos detectados que aún no están resueltos. Al arreglarlos, pasa la línea a «Corregido» de la versión correspondiente.

- Ninguno por ahora.

## [Sin publicar]

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
