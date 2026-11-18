---
name: feature-tdd
description: Usar SIEMPRE que en Springfield FS se cree una feature nueva, cambie un comportamiento o se arregle un bug. Flujo TDD (test que falla → código mínimo → refactor) y puerta de salida con test + lint + build.
---

# feature-tdd — TDD para cada feature de Springfield FS

Si está disponible, carga también `agent-skills:test-driven-development` (teoría general: pirámide, DAMP, Prove-It). Lo de aquí manda en caso de conflicto: es específico de este repo.

## Cuándo se aplica
- Feature nueva, cambio de comportamiento o bug fix → **siempre**.
- Excepción: cambios solo de estilo (clases Tailwind sin lógica), textos, config o docs. Si dudas, aplícala.
- Si algo no se puede testear, dilo y propón cómo hacerlo testeable. No lo saltes en silencio.

## Herramientas (ya configuradas)
- **Vitest** + **React Testing Library** + `@testing-library/user-event` + `jest-dom`. JavaScript/JSX, no TypeScript.
- Un test al lado de su código: `Login.jsx` → `Login.test.jsx`. Imports explícitos de `vitest` (no hay globals).
- Comandos: `npm test` (suite) · `npx vitest run src/ruta/archivo.test.jsx` (uno) · `npm run test:watch` · `npm run test:coverage`.
- `vitest.config.js` inyecta variables de Supabase **falsas**. Los tests nunca deben tocar el proyecto real. No leas ni cargues `.env`.

## Flujo (en este orden)
1. **Criterios de aceptación.** 2-5 frases en lenguaje de usuario. Ej.: "la lista muestra una fila por jugador con goles y asistencias". Si hay ambigüedad, pregunta al propietario. Contrasta con `docs/SPEC.md`.
2. **Lista de tests y nivel.** Usa el nivel más bajo posible:
   - Lógica pura (reglas, formateo) → unit en `src/domain/`; casos de uso → unit en `src/application/` con fakes de los ports.
   - Interacción de UI → componente con RTL.
   - Cruza Supabase → adaptador en `src/infrastructure/supabase/` con un cliente falso (ver abajo).
   - Playwright solo para flujos críticos completos (aún no está instalado; no lo añadas sin preguntar).
3. **RED.** Escribe el test, ejecútalo y comprueba que falla **por la razón correcta** (la aserción, no un import roto). Enseña el mensaje de fallo.
4. **GREEN.** Código mínimo para pasar. Nada de "ya que estoy".
5. **REFACTOR.** Con todo en verde, limpia y vuelve a ejecutar.
6. **Puerta de salida.** La feature no está terminada hasta que pasen `npm test`, `npm run lint` y `npm run build`. El hook `Stop` (`.claude/hooks/check.mjs`) lo exige también al cerrar. Con `npm run test:coverage`, la cobertura no puede bajar del umbral de `vitest.config.js`.
7. **Commit** por ciclo, mensaje que diga qué comportamiento se añade. `git commit` pide confirmación en `.claude/settings.json`: propón el mensaje y espera.

## Cómo falsear Supabase
Con Clean Architecture (ADR-0001) no hace falta `vi.mock`: cada capa recibe sus dependencias, así que se le pasa una falsa.

- **Adaptador de Supabase** (`src/infrastructure/supabase/`): recibe el cliente por parámetro. Pásale un cliente falso y comprueba qué pide y qué devuelve ya traducido:

```js
const rpc = vi.fn().mockResolvedValue({ data: [{ nickname: 'Cris', goals: 3 }], error: null })
const repository = createSupabaseSquadRepository({ rpc })

expect(await repository.getStats({ seasonId: 1, competitionId: null })).toEqual([{ nickname: 'Cris', goals: 3 }])
expect(rpc).toHaveBeenCalledWith('get_squad_stats', { p_season_id: 1, p_competition_id: null })
```
- **Caso de uso** (`src/application/use-cases/`): fakes de los ports (objetos con `vi.fn()`).
- **UI** (`src/infrastructure/ui/`): casos de uso falsos en `<UseCasesContext.Provider value={...}>`; comprueba lo que ve el usuario.

Ejemplos completos: `src/infrastructure/supabase/profile-repository.test.js` (cadena `from().select().eq().single()`), `src/application/use-cases/auth.test.js`, `src/infrastructure/ui/auth/AuthProvider.test.jsx` (promesas pendientes) y `src/infrastructure/ui/components/Login.test.jsx`.

## Reglas del proyecto que los tests deben proteger
- **Los totales no se calculan en el frontend.** Si existe una RPC (`get_squad_stats`, `get_player_rating_timeline`, `get_season_mvps`), el test falsea la RPC y comprueba que la UI **pinta lo que devuelve**, sin recalcular.
- **Anonimato de votos.** El frontend nunca lee la tabla `votes` de otros. Si una feature toca votación, añade un test que falle si se llama a `from('votes')` para leer votos ajenos, y otro que compruebe que la media no se muestra con la votación abierta.
- **Rol ≠ seguridad.** Un test de UI que oculta un botón a un jugador es útil, pero no sustituye a RLS. Los permisos reales se prueban en la base de datos (siguiente punto).
- **Estados de `useAuth()`**: cubre `loading`, sin usuario, con usuario sin perfil y cada rol relevante.

## Cambios de base de datos (migraciones, RLS, RPC, triggers)
- Tests pgTAP en `supabase/tests/database/NN_area.test.sql` (ADR-0002). Para cada migración nueva, escribe **antes** el test, ejecútalo con `npm run db:test` y enseña el fallo; después la migración (`npm run db:reset` la aplica en local) y el test en verde.
- Cada archivo: `begin;` → `\ir ../helpers.psql` → `select no_plan();` → aserciones → `select * from finish();` → `rollback;`. Crea tus propios datos (nombres como `TEST 04` para no chocar con el seed). Actúa como un usuario con `select pg_temp.act_as(<uuid>)` y vuelve con `reset role;`.
- Todo corre en Supabase **local** (Docker). **Nunca en producción.** Aplicar la migración a la nube lo decide el propietario.
- Nunca edites una migración ya aplicada: crea una nueva.

## Prohibido
- Borrar, saltar (`it.skip`, `describe.skip`) o debilitar aserciones para llegar a verde.
- Bajar los umbrales de cobertura para que pase.
- Dar la feature por terminada sin haber ejecutado la suite.
- Un test que pasa a la primera sin haberlo visto fallar (para código nuevo).
- Probar detalles internos (nombres de estado, métodos privados): prueba lo que ve o recibe el usuario.

## Modo aprendizaje (propietario)
Tras cada ciclo, explica en español y en pocas líneas: qué test escribiste, por qué falló primero y qué lo hizo pasar. Nombres de funciones y variables en inglés. Sin repetir lo ya explicado. Una analogía deportiva como mucho y solo si aclara.

## Cierre
Termina con: tests añadidos, resultado de la puerta de salida y qué queda sin cubrir.
