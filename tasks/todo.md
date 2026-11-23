# Tareas — Panel de admin (paso 5 de `docs/SPEC.md` §10)

Detalle, decisiones y riesgos: [`tasks/plan.md`](plan.md).

- Una tarea = un commit (con confirmación). Se trabaja con `feature-tdd`, capa a capa.
- Puerta de cada tarea: `npm test`, `npm run lint`, `npm run build` (y `npm run db:test` si toca la BD).
- Solo datos ficticios (`@example.com`) en tests y capturas.

## Fase 0 — Plan, spec y diseño

- [x] **T0.** Guardar el plan en `tasks/`
- [x] **T1.** Spec del panel: `docs/SPEC.md` §12 (nueva), §9 y §10
  - La §12 recoge acceso, secciones, reglas con votos, «el marcador manda», fotos y usuarios
- [x] **T2.** Diseño: maqueta a 360 px y 1280 px, aprobada por el propietario el 2026-11-23
  - Solo tokens existentes; objetivos táctiles de 44 px; errores y confirmaciones dibujados

## Fase 1 — Cimientos, temporadas y competiciones → PR, 0.12.0

- [x] **T3.** Migración de integridad y empates de MVP (pgTAP rojo → verde; `doubt-driven-development`)
  - Con votos, la BD rechaza borrar o reabrir el partido, reabrir la votación por la fecha y quitar o dejar a 0 minutos a un votado; corregir lo demás sigue funcionando
  - Rechaza un partido terminado con fecha futura, dejar a 0 minutos a un goleador o asistente, quitar de la plantilla a un convocado y un MVP que no empate en cabeza
  - `get_mvp_ties` da los empatados al staff y 42501 al resto; `08_hardening` al día; tests `01`-`10` en verde
- [x] **T4.** Ruta `/admin` protegida y botón «Admin»
  - El staff ve «Admin» y llega; jugador y viewer, no (en `/admin`, «Esta página no existe»)
  - El panel sale en un archivo aparte del build; la temporada vive en `?temporada=`
- [x] **T5.** Temporadas (estrena `errors.js`, `useAsync`, `ports/admin.js`)
  - Se crea una temporada y sale en la lista y los selectores; marcar actual desmarca la anterior
  - Nombre repetido o fin antes del inicio, con frase
- [ ] **T6.** Competiciones
  - Se crea «Amistosos» y aparece en el filtro de la plantilla; nombre repetido, con frase
- [ ] **Checkpoint 1 (PR 1):** suite completa + cobertura + `db:test`, navegador a 360/1280 px, `review` + `security-and-hardening` + `accessibility`, `CHANGELOG` 0.12.0 y `CLAUDE.md`. **PARADA.**

## Fase 2 — Jugadores, fotos, plantilla y votantes → PR, 0.13.0

- [ ] **T7.** Fichas de jugadores (estrena `ConfirmButton`)
  - Alta con correo: se ve con su correo y «Sin cuenta»; archivar (con confirmación) y recuperar
  - Nunca se pide `email` a `players`: sale de `get_player_emails`
- [ ] **T8.** Fotos: recorte cuadrado, 512 px, webp o jpeg, vista previa, cambiar y quitar
  - Una foto de móvil de 5 MB se sube como 512 × 512; al cambiarla, la vieja desaparece del bucket
  - Si algo falla, se avisa y la ficha no apunta a un archivo inexistente
- [ ] **T9.** Plantilla, dorsales y copiar plantilla
  - Dorsal repetido, con frase; quitar a un convocado lo impide la BD; con la plantilla vacía, copiar la anterior
- [ ] **T10.** Votantes de la temporada (viewers con interruptor)
  - Marcar/desmarcar un viewer cambia `season_voters`; los jugadores no salen en la lista
- [ ] **Checkpoint 2 (PR 2):** como el 1, `CHANGELOG` 0.13.0. **PARADA.**

## Fase 3 — Partidos → PR, 0.14.0

- [ ] **T11.** Partidos: lista, alta, edición y borrado
  - Alta con la jornada siguiente propuesta; jornada repetida, con frase; «Borrar» solo en partidos sin terminar
- [ ] **T12.** Convocatoria, minutos y tarjetas
  - Se guarda y al reabrir sigue igual; no se desconvoca a quien tiene goles o penaltis; los rechazos de la BD, como frase
- [ ] **T13.** Goles y penaltis fallados
  - Solo convocados con minutos; en un penalti no hay asistente; con menos goles que el resultado, avisa sin bloquear
- [ ] **T14.** Terminar y reabrir
  - Explica qué falta; avisa hasta cuándo estará abierta la votación; reabrir con votos lo impide la BD
- [ ] **Checkpoint 3 (PR 3):** como el 1, `CHANGELOG` 0.14.0. Pedir al propietario aplicar la migración de T3 en la nube. **PARADA.**

## Fase 4 — Desempate de MVP y usuarios → PR, 0.15.0

- [ ] **T15.** Desempate de MVP
  - Salen solo los empatados con su media; se puede cambiar la elección; con la votación abierta no aparece nada
- [ ] **T16.** Usuarios y roles (solo superadmin)
  - Hacer/quitar admin con confirmación; su propia fila y la de otro superadmin, sin botones
- [ ] **Checkpoint final (PR 4):** como el 1, `CHANGELOG` 0.15.0, recorrido completo de `plan.md`. `docs/SPEC.md` §10 con el paso 5 hecho y `CLAUDE.md` al día. **PARADA.**
