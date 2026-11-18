# ADR-0002: Supabase local y tests SQL con pgTAP

**Estado:** Aceptado (2026-11-18)
**Decisores:** Propietario del proyecto

## Contexto

Las migraciones se aplicaban a mano en el SQL Editor del proyecto de la nube, y las pruebas del esquema (las «31 pruebas» de la spec) no estaban en el repositorio. No había forma repetible de comprobar que un cambio de RLS, de un trigger o de una RPC no rompe nada, y cada prueba corría junto a datos y cuentas reales.

Se va a reforzar el backend (tests, auditoría de seguridad, notificaciones push, cambios en las reglas de votación) antes de construir pantallas, así que hace falta un entorno de pruebas propio.

## Decisión

- **Supabase local** con la CLI (`supabase` como dependencia de desarrollo) y Docker. La base de datos de pruebas vive en el PC del desarrollador y en el CI, nunca en la nube.
- **Tests SQL con pgTAP** en `supabase/tests/database/*.test.sql`, ejecutados con `supabase test db`. Cada archivo corre en una transacción que se deshace al final.
- Auxiliares comunes en `supabase/tests/helpers.psql` (crear usuarios de prueba y actuar como ellos), incluidos con `\ir`. Son funciones temporales (`pg_temp`) que no llegan a ninguna base de datos real.
- El **CI** arranca Supabase local y ejecuta los tests SQL en un job aparte (`database`).

## Opciones consideradas

| Opción | A favor | En contra |
|---|---|---|
| **Supabase local + pgTAP (elegida)** | Tests repetibles con un comando, también en CI; se puede resetear todo en segundos; nunca toca datos reales | Requiere Docker; primera descarga de varios GB |
| SQL Editor de la nube con scripts manuales | No instala nada | Cada prueba la ejecuta una persona a mano; corre junto a datos reales; no hay CI |

## Consecuencias

- Una migración nueva se prueba con `npm run db:reset` y `npm run db:test` antes de llegar a la nube.
- El seed (`supabase/seed.sql`) se carga **solo** en local: `db:reset` lo aplica a la base de datos local, nunca a la nube.
- Aplicar migraciones a la nube sigue siendo una decisión explícita del propietario (`supabase link` / `db push` piden confirmación).
- La base de datos local usa Postgres 17.
