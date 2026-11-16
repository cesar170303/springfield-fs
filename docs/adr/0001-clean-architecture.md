# ADR-0001: Clean Architecture en el frontend

**Estado:** Aceptado (2026-11-15)
**Fecha:** 2026-11-15
**Decisores:** Propietario del proyecto

## Contexto

El frontend (React + Vite + Supabase) tiene hoy 5 archivos de producción: `lib/supabase.js`, `context/AuthProvider.jsx`, `context/auth-context.js`, `components/Login.jsx` y `App.jsx`. Todos hablan con Supabase o con React directamente.

Lo que viene (lista de plantilla, ficha con gráfica, panel de admin, votación, rankings, push) multiplicará los puntos de contacto con Supabase. Conviene fijar la estructura **antes** del paso 3 para no migrar después.

Fuerzas en juego:

- **La lógica pesada vive en PostgreSQL**, por regla del proyecto: totales, medias, MVP y anonimato de votos salen de las RPC y de RLS. El frontend no los recalcula.
- **La seguridad la pone RLS**, no el frontend. Ninguna estructura de carpetas la sustituye.
- Se quiere código **testeable sin tocar Supabase** (Vitest, TDD) y fácil de entender para quien está aprendiendo.
- El equipo es una sola persona: el coste de cada capa extra es real.

## Decisión

Adoptar **Clean Architecture con tres capas** y una sola regla de dependencia:

| Capa | Qué contiene | Puede importar |
|---|---|---|
| **domain** | Entidades, value objects y reglas puras del negocio | Solo `domain` |
| **application** | Casos de uso y *ports* (contratos que necesita de fuera) | `domain` y `application` |
| **infrastructure** | Todo lo concreto: Supabase, React, PWA, composición | `domain`, `application` e `infrastructure` |

Las flechas de dependencia siempre apuntan hacia dentro: `infrastructure → application → domain`. Nunca al revés.

### Estructura

```
src/
  domain/
    player.js          # displayName(): apodo si existe, si no nombre (SPEC §1)
    rating.js          # 1–10 en medios puntos
    voting.js          # votación abierta/cerrada: 7 días desde el partido
    role.js            # canManage(role): solo para decidir qué mostrar
  application/
    ports/             # contratos (JSDoc @typedef): SquadRepository, AuthGateway…
    use-cases/         # getSquadStats, listSeasons, signInWithPassword…
  infrastructure/
    supabase/          # client.js + repositorios que implementan los ports + mappers
    ui/                # React: componentes, hooks, contexto de sesión
    composition.js     # raíz de composición: crea repositorios y los inyecta
  main.jsx             # arranque: solo llama a composition y monta React
```

### Reglas de convivencia

1. **La UI solo llama a casos de uso**, nunca a un repositorio ni a `supabase` directamente.
2. **Un caso de uso es una función** que recibe sus dependencias (`createGetSquadStats({ squadRepository })`). Sin clases ni frameworks de inyección.
3. **Los repositorios traducen** `snake_case` de Postgres a los objetos de `domain` (mappers). La base de datos nunca "se cuela" en la UI.
4. **El dominio no duplica lo que hace la base de datos.** Si el cálculo ya está en una RPC, no se reimplementa. El dominio solo contiene reglas que el frontend necesita para **mostrar** (p. ej. si la votación sigue abierta) y la base de datos sigue siendo la fuente de verdad (constraints, triggers, RLS).
5. **Ninguna capa interna conoce Supabase ni React.** Se verifica automáticamente (ver acciones).
6. **El repositorio de votos nunca lee votos ajenos**: solo expone emitir el propio voto y consultar el propio. Refuerza la regla de anonimato del CLAUDE.md.

### Dónde va React

React va **dentro de `infrastructure/ui/`**, tal como se planteó: la infraestructura es el anillo exterior y conoce todas las capas. No se crea una cuarta capa `presentation`.

## Opciones consideradas

### Opción A: Clean Architecture, 3 capas (elegida)

| Dimensión | Valoración |
|---|---|
| Complejidad | Media-alta para el tamaño actual |
| Coste inicial | Más archivos y mappers por feature |
| Testabilidad | Alta: dominio y casos de uso se prueban sin mocks de Supabase |
| Familiaridad | Buena para quien conoce Java (es el patrón habitual) |

**Pros:** cambiar de proveedor de backend afecta solo a `infrastructure/supabase`; el dominio y los casos de uso se testean con fakes simples; fronteras claras para crecer.
**Contras:** más indirección; muchos casos de uso serán delgados (leer y devolver); riesgo de ceremonia.

### Opción B: Estructura por features sin capas

`features/squad/`, `features/auth/`…, con las llamadas a Supabase dentro de hooks.

| Dimensión | Valoración |
|---|---|
| Complejidad | Baja |
| Coste inicial | Mínimo |
| Testabilidad | Media: hay que falsear `supabase` en cada test |
| Familiaridad | Alta en React |

**Pros:** menos código, más rápido. **Contras:** Supabase se acopla a la UI y a cada feature; el cambio de backend o de forma de los datos toca todo.

### Opción C: Clean Architecture con 4 capas (UI separada)

Igual que A pero con `presentation/` aparte.

**Pros:** React queda aislado de adaptadores como Supabase. **Contras:** una capa más para una sola persona; la UI y los adaptadores rara vez cambian de forma independiente aquí.

## Análisis de compromisos

- La mayor parte de la inteligencia está en la base de datos, así que **el dominio será pequeño**. Es normal y no es un fallo: no hay que inventar lógica para "llenar" la capa.
- A cambio, la separación da un beneficio concreto: **tests rápidos y sin red** para reglas como la ventana de votación y para los casos de uso, y una única puerta (`infrastructure/supabase`) por la que entra y sale cualquier dato.
- La opción A cuesta más que la B hoy; se paga en el paso 5 (panel de admin) y en el 6 (votación), donde hay más reglas y más tablas.

## Consecuencias

**Más fácil**
- Probar reglas y casos de uso sin Supabase.
- Localizar dónde se rompe algo: la capa dice quién es responsable.
- Que cada nueva feature siga la misma receta.

**Más difícil**
- Añadir una pantalla sencilla ahora exige tocar port, caso de uso, repositorio, mapper y UI.
- Mantener la disciplina de no saltarse las capas "por rapidez".

**A revisar**
- Si tras el paso 5 casi todos los casos de uso son *pass-through*, valorar relajar la regla 1 para lecturas simples.
- Todo el código existente (`lib/`, `context/`, `components/`) debe migrarse a `infrastructure/`.

## Acciones

1. [x] Confirmar las decisiones abiertas (abajo) y pasar este ADR a **Aceptado**.
2. [x] Actualizar la sección «Arquitectura del frontend» de `CLAUDE.md` para que describa estas capas y la regla de dependencia.
3. [x] Automatizar la regla de dependencia: `no-restricted-imports` por carpeta en `.oxlintrc.json` (`overrides`). Comprobado que el lint falla con imports prohibidos en `domain/` y `application/`.
4. [x] Migrar el código existente: `lib/supabase.js` → `infrastructure/supabase/client.js`; `context/*` y `components/*` → `infrastructure/ui/`; las llamadas de `Login` y `AuthProvider` a Supabase pasan por un port `AuthGateway` y casos de uso. Hacerlo con TDD (`feature-tdd`), manteniendo verdes los tests actuales.
5. [ ] Rehacer el plan del paso 3 (lista de plantilla) con esta estructura: `SquadRepository` + caso de uso `getSquadStats` + mapper, en lugar de hooks que llamen a Supabase.

## Decisiones cerradas al aceptar

- **React va dentro de `infrastructure/ui/`**, sin capa `presentation` separada (opción C descartada).
- **Contratos de los ports con JSDoc `@typedef`**; el paso a TypeScript, si llega, será otra decisión.
