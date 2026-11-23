# Plan: panel de admin (paso 5 de `docs/SPEC.md` §10)

## Contexto

- Pasos 1-4 hechos (0.11.0, en `main`). Paso actual (`frontend-workflow`): **5, el panel de admin** — «temporadas, jugadores (con foto), plantilla y dorsales, partidos, convocatoria y minutos, goles, tarjetas, penaltis fallados, cerrar partido y desempatar MVP».
- Hoy el staff solo puede meter datos con SQL. RLS ya le deja escribir todo (tests `01` y `07`), pero no hay pantallas y el panel destaparía tres huecos:
  - quitar a un jugador de la convocatoria, o borrar un partido, **borra en cascada los votos** que recibió, y los votos son definitivos (§6);
  - nada impide dejar a 0 minutos a quien ya tiene goles, ni quitar de la plantilla a quien ya jugó esa temporada (sus cifras desaparecerían de la lista);
  - para desempatar el MVP falta saber **quiénes** empatan: `get_season_mvps` solo dice que hay empate.
- Objetivo: el staff lo gestiona todo desde el móvil, a pie de pista, y la base de datos protege los votos.

**Decidido contigo (2026-11-22):** con votos se corrige sin tocar votos · foto con recorte cuadrado automático · el marcador manda (los goles en propia puerta no se apuntan) · entran también usuarios y roles, competiciones y copiar plantilla.

**Ajuste que propongo sobre «impedir cambiar la fecha»:** prohibir solo el cambio que **reabriría una votación ya cerrada**, que es lo que rompe el anonimato (las medias ya se vieron). Con la votación abierta, una fecha mal puesta se puede corregir. Además, cuatro sitios de los tests `04`, `05` y `09` mueven fechas hacia atrás para simular el paso del tiempo y seguirían valiendo tal cual.

## Decisiones de producto → `docs/SPEC.md`, nueva §12 «Panel de admin»

Va al final para no renumerar (CLAUDE.md y el código citan §5, §7, §9…). También se tocan §9 (validaciones y RPC nuevas) y §10 (paso 5).

- **Acceso:** `/admin` y subrutas solo para el staff (`admin` y `superadmin`); al resto, «Esta página no existe». Botón «Admin» en la barra inferior, solo para el staff. El código del panel se descarga solo al entrar. La seguridad sigue siendo RLS. Sin animaciones nuevas (no está entre las cinco aprobadas).
- **Inicio del panel:** selector de temporada (`?temporada=`), avisos (partidos jugados sin terminar, empates de MVP) y las secciones.
- **Temporadas:** crear y editar (nombre `2026/27`, inicio y fin) y marcar la actual (solo una). No se borran.
- **Competiciones:** crear y editar (nombre y tipo: Liga, Copa o Amistoso). No se borran.
- **Jugadores:**
  - fichas activas y archivadas (aparte), con foto, apodo, nombre, posición, estado, correo (solo staff, `get_player_emails`) y si tiene cuenta vinculada;
  - crear y editar: nombre, apellidos, apodo (opcional), correo (opcional; al registrarse y confirmarlo se vincula solo), posición y estado;
  - archivar (conserva su historial y no entra en temporadas nuevas) y recuperar. No se borran;
  - foto: la app recorta el centro en cuadrado, la reduce a 512 × 512 y la guarda en webp (jpeg si el navegador no sabe webp), con vista previa. Cambiar y quitar.
- **Plantilla y dorsales** (por temporada): añadir fichas no archivadas con dorsal (1-99, único en la temporada), cambiar el dorsal y quitar (solo si no fue convocado esa temporada). Con la plantilla vacía: «Copiar la plantilla de 2026/27» (no archivados, con su dorsal).
- **Votantes** (por temporada): los viewers, cada uno con «Vota esta temporada». La plantilla vota siempre.
- **Partidos:**
  - lista de la temporada: etiqueta (`J5`, `Copa J2`), rival, fecha, resultado y estado («Por jugar», «Por terminar», «Votación abierta hasta el …», «Votación cerrada», «Empate de MVP»);
  - crear y editar: competición, jornada (propone la siguiente), fecha y hora, rival y resultado. Borrar, solo si no está terminado;
  - convocatoria, de la plantilla: por convocado, minutos (0-40), amarilla y roja (doble amarilla = solo roja);
  - goles: goleador (con minutos), tipo (normal, penalti, doble penalti) y asistente opcional (nunca en penaltis). Penaltis fallados: jugador y tipo. Un gol mal apuntado se borra y se apunta otra vez;
  - **el marcador manda:** puede haber menos goles apuntados que a favor (gol en propia puerta del rival); la app avisa de los que faltan, pero deja terminar;
  - **terminar** pide resultado, que ya se haya jugado y alguien con minutos; dice hasta cuándo estará abierta la votación (o que no habrá, si ya pasaron 7 días) y pide confirmación. **Reabrir**, solo si nadie ha votado;
  - **con votos, se corrige sin tocar votos:** resultado, minutos, goles, tarjetas, rival, jornada y competición se corrigen; la base de datos impide borrar o reabrir el partido, reabrir su votación cambiando la fecha y quitar de la convocatoria (o dejar a 0 minutos) a un jugador votado;
  - **desempate de MVP:** con la votación cerrada y empate en la mejor media, el admin elige entre los empatados (y puede cambiarlo). La base de datos no deja elegir a otro.
- **Usuarios** (solo superadmin): cuentas con correo, nombre, rol y ficha vinculada; «Hacer admin» y «Quitar admin» (vuelve a jugador si tiene ficha; si no, a viewer). Ni su propia cuenta ni la de otro superadmin se tocan desde la app.
- **Confirmaciones:** archivar, quitar, borrar, terminar, reabrir y cambiar roles piden confirmación en el mismo sitio («¿Seguro? Sí, archivar · Cancelar»), sin ventanas emergentes. Cada error, con una frase en español.

## Base de datos: una migración nueva, `<fecha>_admin_integrity.sql`

Test antes: `supabase/tests/database/11_admin_integrity.test.sql` (rojo → verde). Las funciones de trigger van en `private`, `security definer` y `search_path = ''`, sin `execute` para nadie: necesitan ver los votos, que RLS oculta incluso al staff.

| Regla | Dónde |
|---|---|
| Con votos: no borrar el partido, no reabrirlo (`is_finished` → false) y no cambiar la fecha si eso reabre una votación cerrada | trigger en `matches` (before update or delete) |
| No puede haber un partido terminado con fecha futura | trigger en `matches` (before insert or update) |
| Con votos: no quitar al jugador de la convocatoria ni dejarle a 0 minutos. Con goles o asistencias: no dejarle a 0 minutos | trigger en `match_squad` (before update of minutes or delete) |
| No quitar de la plantilla a quien fue convocado esa temporada | trigger en `player_seasons` (before delete) |
| `mvp_override_player_id`: null o uno de los empatados en la mejor media, con la votación cerrada | trigger en `matches` (before insert or update of `mvp_override_player_id`) |
| RPC `get_mvp_ties(p_season_id)` → `match_id, player_id, rating` de los empatados en cabeza; solo staff (42501 si no) | `public`; se añade a la lista de `08_hardening.test.sql` |

- Mensajes con `raise exception` en español: la app los enseña tal cual.
- Borrar un partido **sin** votos sigue arrastrando su convocatoria y sus goles (caso en el test).
- Anonimato: el error «ya tiene votos» revela **que** alguien votó, nunca **qué** (lo mismo que ya usa el recordatorio push). Se anota en `docs/security/2026-11-auditoria.md`.
- Aplicarla en la nube lo decide el propietario; lo natural, al cerrar la fase 3, antes de usar el editor de partidos contra la nube.

## Decisiones técnicas

- **Capas (ADR-0001):**
  - dominio: `user.js` (`isStaff`, `isSuperadmin`, `roleWithoutAdmin`), `match.js` (tipos de competición, `matchLabel`, `votingClosesAt`, `matchState`, `nextRound`, `canLeaveSquad`, `scorerOptions`, `assistOptions`, `missingGoals`, `finishCheck`), `roster.js` (`playersToAdd`, `rosterToCopy`, `previousSeason`); opciones de posición y estado exportadas desde `squad.js` y `player.js`;
  - aplicación: `ports/admin.js` y casos de uso `admin-seasons.js`, `admin-players.js`, `admin-matches.js` y `admin-accounts.js`;
  - infraestructura: `season-admin-repository.js`, `player-admin-repository.js`, `match-admin-repository.js`, `account-admin-repository.js`, mappers nuevos en `mappers.js` y la UI en `src/infrastructure/ui/components/admin/`.
- **Errores legibles:** `supabase/errors.js` (`readableError`) traduce `P0001` (frases de los triggers, tal cual), `23505` por nombre de restricción («Ese dorsal ya lo lleva otro jugador esta temporada», «Ya hay un partido de esa competición en esa jornada», «Ya hay una ficha con ese correo»…), `23514`, `23503` y `42501`. Los nombres de restricción se comprueban en la BD local.
- **`players`:** siempre columnas concretas; nunca `select *` ni `.select()` vacío tras un insert o un update (el correo no es legible). Los correos, con `get_player_emails()`.
- **Carga y recarga:** `ui/use-async.js` (`useAsync(load, deps)` → `{ data, error, reload }`), con el mismo control de respuestas viejas que `SquadScreen`. Tras cada cambio se recarga la sección.
- **Temporada en la URL:** se reutiliza `useSeasonFilters`; `SeasonFilters` gana la opción de ocultar la competición.
- **Fotos:** `ui/image.js` (`squarePhoto(file)`: `createImageBitmap` + `<canvas>` → webp o jpeg). El caso de uso sube a una ruta nueva (`players/<id>-<marca de tiempo>.webp`, para que la caché de la URL pública no enseñe la vieja), guarda `photo_path` y borra la anterior; si falla al guardar, borra la nueva.
- Los guardados en varios pasos (temporada actual, convocatoria, foto) van en el orden que no pierde datos si fallan a medias.
- Fecha del partido con `<input type="datetime-local">`, en hora local.
- La barra recibe `staff` desde `AppShell`, que ya tiene el rol: `BottomNav` sigue sin contexto.
- **Sin dependencias nuevas, sin tokens nuevos sin preguntar, ningún componente lee `votes`.** No hace falta ADR nuevo salvo que el diseño cambie la navegación (ADR-0004).

## Rutas

| Ruta | Pantalla | Quién |
|---|---|---|
| `/admin?temporada=` | `AdminHome`: temporada, avisos y secciones | staff |
| `/admin/temporadas` | `SeasonsAdmin` + `CompetitionsAdmin` | staff |
| `/admin/jugadores` · `/admin/jugadores/nuevo` · `/admin/jugadores/:playerId` | `PlayersAdmin` · `PlayerForm` (+ `PhotoField`) | staff |
| `/admin/plantilla?temporada=` | `RosterAdmin` | staff |
| `/admin/votantes?temporada=` | `VotersAdmin` | staff |
| `/admin/partidos?temporada=` · `/admin/partidos/:matchId` | `MatchesAdmin` · `MatchEditor` (`MatchForm`, `SquadEditor`, `GoalsEditor`, `FinishMatch`, `MvpTiebreak`) | staff |
| `/admin/usuarios` | `AccountsAdmin` | superadmin |

Piezas comunes: `AdminRoutes` (rutas hijas, cargadas con `React.lazy`), `AdminPage` (cabecera con «‹ Panel» y título) y `ConfirmButton` (confirmación en el sitio).

## Cómo se trabaja cada tarea

- `feature-tdd`, capa a capa (dominio → caso de uso → repositorio → UI), con la explicación corta tras cada ciclo (modo aprendizaje). Componentes con `agent-skills:frontend-ui-engineering`; BD con `supabase` y `security-and-hardening`.
- Cada sección añade su enlace al inicio del panel.
- Puerta de cada tarea: `npm test`, `npm run lint` y `npm run build` (y `npm run db:test` si toca la BD). Un commit por tarea, con confirmación.
- Solo datos ficticios (`@example.com`) en tests y capturas.

## Tareas

Tamaño, contando tests: S = 1-2 archivos · M = 3-5 · L = 6-8.

### Fase 0 — Plan, spec y diseño

**T0. Guardar el plan.** `tasks/plan.md` (este documento) y `tasks/todo.md` (lista con casillas, la que lee `/build`); se suben con la spec, no tienen datos personales. S.

**T1. Spec del panel** (`agent-skills:spec`)
- Qué: §12 con las decisiones de arriba; §9 con `get_mvp_ties` y las validaciones nuevas; §10 con el detalle del paso 5.
- Criterios: la §12 recoge acceso, secciones, reglas con votos, «el marcador manda», fotos y usuarios.
- Verificación: lo revisa el propietario. · Archivos: `docs/SPEC.md`. · Depende de: T0. · S.

**T2. Diseño del panel — PARADA**
- Qué: `impeccable` (`shape`) + `frontend-design` con la dirección de §11. Maqueta HTML (Artifact privado) a 360 px y 1280 px: barra con «Admin» e inicio del panel; lista de jugadores y ficha con foto; editor de partido (convocatoria con minutos y tarjetas, goles con el aviso de los que faltan, terminar y desempate).
- Criterios: solo tokens existentes (si hiciera falta uno, p. ej. un verde de «guardado», se pregunta); objetivos táctiles de 44 px; errores y confirmaciones dibujados.
- Verificación: **el propietario aprueba la maqueta antes de escribir UI**; lo que salga nuevo, a la §12. · Depende de: T1. · M.

### Fase 1 — Cimientos, temporadas y competiciones → PR, 0.12.0

**T3. Migración de integridad y empates de MVP** (riesgo alto: `doubt-driven-development`)
- Qué: lo de la sección «Base de datos». Primero el test pgTAP en rojo; después la migración.
- Criterios:
  - con votos, la BD rechaza con su frase borrar o reabrir el partido, reabrir la votación por la fecha y quitar o dejar a 0 minutos a un votado; corregir resultado, minutos, goles, tarjetas, rival y jornada sigue funcionando;
  - rechaza un partido terminado con fecha futura, dejar a 0 minutos a un goleador o asistente, quitar de la plantilla a un convocado y un MVP que no empate en cabeza;
  - `get_mvp_ties` da los empatados al staff y 42501 al resto; `08_hardening` al día; los tests `01`-`10` siguen en verde.
- Verificación: `npm run db:reset` + `npm run db:test` (rojo enseñado antes); revisión adversarial de cascadas, permisos y anonimato.
- Archivos: `supabase/tests/database/11_admin_integrity.test.sql`, `supabase/tests/database/08_hardening.test.sql`, `supabase/migrations/<fecha>_admin_integrity.sql`, `docs/security/2026-11-auditoria.md`. · Depende de: T1 (se puede hacer mientras se aprueba T2). · M.

**T4. Ruta `/admin` protegida y botón «Admin»**
- Qué: `isStaff` e `isSuperadmin`; ruta `admin/*` con `React.lazy`; `AdminRoutes`, `AdminPage` y `AdminHome` con el selector de temporada; «Admin» en la barra solo para el staff.
- Criterios:
  - admin y superadmin ven «Admin» y llegan a `/admin`; un jugador o un viewer no lo ven, y en `/admin` leen «Esta página no existe»;
  - el panel sale en un archivo aparte del build;
  - la temporada del panel vive en `?temporada=`.
- Verificación: tests de `user.js`, `App`, `BottomNav` y `AdminHome`; el chunk aparte en `npm run build`; navegador a 360 px.
- Archivos: `src/domain/user.js`, `src/infrastructure/ui/App.jsx`, `components/{BottomNav,Icon,SeasonFilters}.jsx`, `components/admin/{AdminRoutes,AdminPage,AdminHome}.jsx` (+ tests). · Depende de: T2. · L.

**T5. Temporadas**
- Qué: listar, crear, editar y marcar como actual. Estrena `errors.js`, `useAsync`, `ports/admin.js`, `admin-seasons.js` y `season-admin-repository.js`.
- Criterios:
  - el admin crea «2027/28» con sus fechas y sale en la lista y en los selectores;
  - al marcar una temporada como actual, la anterior deja de serlo;
  - un nombre repetido o un fin antes del inicio se explican con una frase.
- Verificación: tests de `errors.js`, caso de uso (fakes), repositorio (cliente falso), `useAsync` y `SeasonsAdmin`; navegador.
- Archivos: `application/ports/admin.js`, `application/use-cases/admin-seasons.js`, `infrastructure/supabase/{errors,season-admin-repository,mappers}.js`, `infrastructure/composition.js`, `ui/use-async.js`, `components/admin/SeasonsAdmin.jsx` (+ tests). · Depende de: T4. · L (primera rebanada: estrena las piezas comunes).

**T6. Competiciones**
- Qué: listar, crear y editar (nombre y tipo) en la pantalla de temporadas.
- Criterios: se crea «Amistosos» (tipo Amistoso) y aparece en el filtro de la plantilla; un nombre repetido se explica.
- Verificación: tests de dominio (tipos), caso de uso, repositorio y `CompetitionsAdmin`.
- Archivos: `domain/match.js`, `use-cases/admin-seasons.js`, `season-admin-repository.js`, `components/admin/CompetitionsAdmin.jsx` (+ tests). · Depende de: T5. · M.

**Checkpoint 1 (PR 1)**
- `npm test` + `npm run test:coverage` (umbrales) + `npm run lint` + `npm run build` + `npm run db:test`.
- Navegador (`dev-supabase-local`) a 360 px y 1280 px, sin errores en consola; un jugador no ve el panel.
- `agent-skills:review` + `security-and-hardening` (migración) + `accessibility` (formularios).
- `CHANGELOG.md` 0.12.0, `package.json`, `CLAUDE.md` («Estado actual» y «Qué hay ya en cada capa (panel de admin)»). Commit y PR con confirmación. **PARADA:** capturas y resumen.

### Fase 2 — Jugadores, fotos, plantilla y votantes → PR, 0.13.0

**T7. Fichas de jugadores**
- Qué: lista (activas y archivadas), alta y edición, archivar y recuperar (estrena `ConfirmButton`).
- Criterios:
  - el admin crea una ficha con correo y la ve con su correo y «Sin cuenta»;
  - archivar (con confirmación) la pasa a «Archivados» y recuperar la devuelve;
  - nunca se pide `email` a `players`: sale de `get_player_emails`.
- Verificación: tests de caso de uso, repositorio (columnas explícitas), `PlayersAdmin` y `PlayerForm`; `security-and-hardening` (correos).
- Archivos: `ports/admin.js`, `use-cases/admin-players.js`, `supabase/{player-admin-repository,mappers}.js`, `composition.js`, `components/admin/{PlayersAdmin,PlayerForm,ConfirmButton}.jsx`, `domain/{squad,player}.js` (+ tests). · Depende de: T5. · L.

**T8. Fotos**
- Qué: subir (recorte cuadrado, 512 px, webp o jpeg, vista previa), cambiar y quitar desde la ficha.
- Criterios:
  - una foto de móvil de 5 MB se sube como 512 × 512 y se ve en la plantilla;
  - al cambiarla, la vieja desaparece del bucket; al quitarla, salen las iniciales;
  - si algo falla, se avisa y la ficha no apunta a un archivo que no existe.
- Verificación: tests de `squarePhoto` (`createImageBitmap` y canvas falsos), caso de uso (subir → guardar → borrar), repositorio (storage falso) y `PhotoField`; en el navegador, con fotos reales de móvil, horizontal y vertical.
- Archivos: `ui/image.js`, `use-cases/admin-players.js`, `player-admin-repository.js`, `components/admin/PhotoField.jsx` (+ tests). · Depende de: T7. · M.

**T9. Plantilla, dorsales y copiar plantilla**
- Qué: por temporada, añadir fichas con dorsal, cambiarlo, quitar y copiar la de la temporada anterior.
- Criterios:
  - se añade un jugador con el 7; un dorsal repetido se explica;
  - quitar a alguien ya convocado lo impide la BD con su frase;
  - con la plantilla vacía, «Copiar la plantilla de 2026/27» trae a los no archivados con su dorsal.
- Verificación: tests de `roster.js`, caso de uso, repositorio y `RosterAdmin`.
- Archivos: `domain/roster.js`, `use-cases/admin-seasons.js`, `season-admin-repository.js`, `mappers.js`, `components/admin/RosterAdmin.jsx` (+ tests). · Depende de: T3, T5, T7. · L.

**T10. Votantes de la temporada**
- Qué: los viewers, con su interruptor «Vota esta temporada».
- Criterios: al marcar a un viewer, queda como votante de esa temporada (`season_voters`); al desmarcarlo, deja de serlo; los jugadores no salen en la lista.
- Verificación: tests de caso de uso, repositorio y `VotersAdmin`.
- Archivos: `ports/admin.js`, `use-cases/admin-accounts.js`, `supabase/{account-admin-repository,mappers}.js`, `composition.js`, `components/admin/VotersAdmin.jsx` (+ tests). · Depende de: T5. · L.

**Checkpoint 2 (PR 2)** — como el 1, con `CHANGELOG.md` 0.13.0. **PARADA.**

### Fase 3 — Partidos → PR, 0.14.0

**T11. Partidos: lista, alta, edición y borrado**
- Qué: lista de la temporada con etiqueta y estado; alta (propone la jornada siguiente); `MatchEditor` con «Datos del partido» (incluido el resultado) y «Borrar» si no está terminado.
- Criterios:
  - el admin crea «J7 · CD Ejemplo · 29 nov 18:30» y lo ve como «Por jugar»;
  - una jornada repetida en la misma competición se explica;
  - «Borrar» solo aparece en partidos sin terminar, con confirmación.
- Verificación: tests de `match.js` (`matchLabel`, `matchState`, `nextRound`, `votingClosesAt`), caso de uso, repositorio (fechas en hora local, sin depender de la zona de la máquina) y pantallas.
- Archivos: `domain/match.js`, `ports/admin.js`, `use-cases/admin-matches.js`, `supabase/{match-admin-repository,mappers}.js`, `composition.js`, `components/admin/{MatchesAdmin,MatchForm,MatchEditor}.jsx` (+ tests). · Depende de: T6. · L.

**T12. Convocatoria, minutos y tarjetas**
- Qué: en el editor, la plantilla con «Convocado», minutos, amarilla y roja, y «Guardar convocatoria».
- Criterios:
  - se convoca a 10 con sus minutos y una amarilla; al volver a abrir el partido, sigue igual;
  - no se puede desconvocar a quien tiene goles o penaltis apuntados (se explica por qué);
  - lo que rechace la BD (un votado, 0 minutos con goles) se ve como frase y la lista vuelve a su estado real.
- Verificación: tests de `canLeaveSquad`, caso de uso (upsert + borrado), repositorio y `SquadEditor`.
- Archivos: `domain/match.js`, `use-cases/admin-matches.js`, `match-admin-repository.js`, `mappers.js`, `components/admin/SquadEditor.jsx` (+ tests). · Depende de: T9, T11. · L.

**T13. Goles y penaltis fallados**
- Qué: añadir y borrar goles (goleador, tipo, asistente) y penaltis fallados, con el contador «3 de 4 goles con goleador».
- Criterios:
  - como goleador o asistente solo salen convocados con minutos; en un penalti no hay asistente;
  - con menos goles que el resultado, avisa de los que faltan sin bloquear;
  - más goles que el resultado → la frase de la BD.
- Verificación: tests de `scorerOptions`, `assistOptions` y `missingGoals`, caso de uso, repositorio y `GoalsEditor`.
- Archivos: `domain/match.js`, `use-cases/admin-matches.js`, `match-admin-repository.js`, `mappers.js`, `components/admin/GoalsEditor.jsx` (+ tests). · Depende de: T12. · L.

**T14. Terminar y reabrir**
- Qué: bloque «Terminar partido» con lo que falta, la fecha de cierre de la votación y confirmación; «Reabrir»; aviso «N partidos por terminar» en el inicio del panel.
- Criterios:
  - sin resultado, sin haberse jugado o sin nadie con minutos, explica qué falta;
  - avisa «La votación estará abierta hasta el 6 dic» (o «Ya no habrá votación: pasaron más de 7 días») y, confirmado, el partido pasa a «Votación abierta» y sus cifras entran en la plantilla (vía RPC);
  - reabrir un partido con votos lo impide la BD con su frase.
- Verificación: tests de `finishCheck`, caso de uso, repositorio, `FinishMatch` y `AdminHome`.
- Archivos: `domain/match.js`, `use-cases/admin-matches.js`, `match-admin-repository.js`, `components/admin/{FinishMatch,AdminHome}.jsx` (+ tests). · Depende de: T3, T13. · M.

**Checkpoint 3 (PR 3)** — como el 1, con `CHANGELOG.md` 0.14.0. Además, **pedir al propietario que aplique en la nube la migración de T3** (decisión suya). **PARADA.**

### Fase 4 — Desempate de MVP y usuarios → PR, 0.15.0

**T15. Desempate de MVP**
- Qué: en el editor de un partido con la votación cerrada y empate, elegir entre los empatados; etiqueta «Empate de MVP» en la lista y aviso en el inicio.
- Criterios:
  - salen solo los empatados, con su media («8,3»); al elegir uno, la plantilla le cuenta el MVP (vía RPC);
  - la elección se puede cambiar;
  - con la votación abierta no aparece nada (anonimato).
- Verificación: tests de caso de uso (cruza `get_mvp_ties` y `get_season_mvps`), repositorio y `MvpTiebreak`; en local, un empate preparado con SQL.
- Archivos: `ports/admin.js`, `use-cases/admin-matches.js`, `match-admin-repository.js`, `mappers.js`, `components/admin/{MvpTiebreak,MatchesAdmin,AdminHome}.jsx` (+ tests). · Depende de: T3, T14. · L.

**T16. Usuarios y roles** (solo superadmin)
- Qué: lista de cuentas y «Hacer admin» / «Quitar admin».
- Criterios:
  - el superadmin hace admin a un viewer y, al quitárselo, vuelve a viewer (o a jugador si tiene ficha), con confirmación;
  - su propia fila y la de otro superadmin no tienen botones;
  - un admin no ve la sección y en `/admin/usuarios` lee «Esta página no existe».
- Verificación: tests de `roleWithoutAdmin`, caso de uso, repositorio y `AccountsAdmin`; `security-and-hardening`.
- Archivos: `domain/user.js`, `use-cases/admin-accounts.js`, `account-admin-repository.js`, `components/admin/{AccountsAdmin,AdminRoutes,AdminHome}.jsx` (+ tests). · Depende de: T10. · M.

**Checkpoint final (PR 4)** — como el 1, con `CHANGELOG.md` 0.15.0, más el recorrido completo de «Verificación». `docs/SPEC.md` §10: paso 5 hecho; `CLAUDE.md` al día. **PARADA:** el propietario decide el siguiente paso (6, la votación).

## Dependencias y orden

```
T0 → T1 ─┬→ T2 (PARADA) → T4 → T5 ─┬→ T6 ──────────→ T11 ─┐
         │                         ├→ T7 → T8              ├→ T12 → T13 → T14 → T15
         │                         ├→ T9 (+T3, T7) ────────┘
         │                         └→ T10 → T16
         └→ T3 (lo necesitan T9, T14 y T15)
```

Orden: T0, T1, T2 (con T3 en paralelo), T4, T5, T6, checkpoint 1, T7-T10, checkpoint 2, T11-T14, checkpoint 3, T15, T16, checkpoint final. Solo T3 va en paralelo: el resto comparte `ports/admin.js`, `composition.js`, `AdminRoutes` y `AdminHome`.

## Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Los triggers chocan con los borrados en cascada (partido → convocatoria → goles y votos) | Alto | Casos de cascada en `11_admin_integrity`; revisión adversarial en T3 |
| Funciones de trigger en `private` que no se ejecutan al dispararlas `authenticated` | Medio | Los tests actúan como admin; si fallara, a `public` sin `execute` |
| Guardados en varios pasos que fallan a medias (temporada actual, convocatoria, foto) | Medio | Orden seguro, recarga tras guardar y error visible |
| Fotos: webp en Safari, orientación EXIF, HEIC del iPhone | Medio | jpeg de reserva; prueba con fotos reales de móvil |
| Zona horaria en la fecha del partido | Medio | `datetime-local` en hora local; tests independientes de la zona |
| Panel usado contra la nube sin la migración aplicada | Medio | Pedirlo en el checkpoint 3; el desempate fallaría con un error legible |
| Tamaño: 16 tareas | Medio | 4 PR con parada en cada uno; se puede reordenar |
| El error «ya tiene votos» revela que alguien votó | Bajo | Solo participación, nunca la nota; anotado en la auditoría |

## Fuera de alcance (anotado, no se hace)

- Borrar fichas (se archivan). Borrar temporadas y competiciones sin partidos **sí** entra: lo pidió el propietario el 2026-11-23.
- Recorte manual de fotos; gol en propia puerta como tipo; editar un gol (se borra y se apunta otra vez).
- Animaciones en el panel; historial de cambios del admin; modo offline.
- Notificaciones push (paso 8): terminar un partido ya abre la votación; el aviso llegará con ese paso.
- Cargar bajo demanda el resto de pantallas (fallo conocido del bundle > 500 kB).

## Verificación de extremo a extremo

1. Docker Desktop abierto: `npm run db:start` → `npm run db:reset` → `npm run db:test`.
2. `npm test`, `npm run test:coverage`, `npm run lint` y `npm run build` (el panel, en un chunk aparte).
3. `preview_start` con `dev-supabase-local` (puerto 5175). Crear una cuenta de prueba en el login y darle `superadmin` con SQL **en el Supabase local** (Studio, http://localhost:54323). Nunca en la nube.
4. A 360 px y 1280 px, sin errores en consola: crear 2027/28 y copiar la plantilla → crear «Amistosos» → ficha nueva con foto real de móvil → dorsal → partido → convocatoria y minutos → resultado y goles (uno sin goleador) → terminar → la plantilla y la ficha del jugador lo reflejan → marcar un votante → desempate preparado con SQL local → hacer y quitar admin.
5. Solo con teclado; nombres accesibles y errores anunciados; contraste AA; con «reducir movimiento», nada se mueve.
6. Con una cuenta `player`: sin «Admin», y `/admin` → «Esta página no existe».
7. Capturas y resumen para el propietario en cada parada.
