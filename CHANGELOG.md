# Changelog

Registro de lo que se hace en cada feature y de los fallos detectados. Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

**Versionado (SemVer 0.x):** feature nueva → sube MINOR (`0.4.0`); arreglo o ajuste pequeño → sube PATCH (`0.3.1`). Pasará a `1.0.0` al publicar en Vercel. La versión vive en `package.json` y debe coincidir con la última entrada de este archivo.

## Fallos conocidos

Fallos detectados que aún no están resueltos. Al arreglarlos, pasa la línea a «Corregido» de la versión correspondiente.

- **PWA no instalable:** `vite.config.js` solo declara un icono de 150×150; Chrome no ofrece «instalar» hasta tener iconos de 192 y 512 px (falta el escudo en alta resolución).

## [Sin publicar]

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
