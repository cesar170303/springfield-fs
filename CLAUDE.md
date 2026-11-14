# Springfield FS — PWA de estadísticas

PWA para que el equipo de fútbol sala **Springfield FS** (Torrejón de Ardoz) registre y consulte las estadísticas de sus jugadores: goles, asistencias, minutos, tarjetas, valoración media votada por los compañeros, MVP y una gráfica de la valoración a lo largo de la temporada.

**La especificación completa, con todas las decisiones de producto, está en `docs/SPEC.md`. Léela antes de proponer cualquier cambio de funcionalidad o de esquema.**

## Stack
- Frontend: React + Vite + Tailwind CSS, PWA con `vite-plugin-pwa`
- Backend: Supabase (Postgres + Auth con email y Google + Storage + RLS)
- Hosting: Vercel

## Estado actual
- Backend diseñado y probado: `supabase/migrations/20261114120000_initial_schema.sql`.
- `supabase/seed.sql`: datos de prueba, **solo para desarrollo**.
- Frontend: sin empezar. El diseño visual se decide después; por ahora, componentes funcionales con Tailwind básico.
- `public/escudo.png`: escudo del equipo (150×150; falta una versión en alta resolución).

## Reglas del proyecto
- **Los totales nunca se guardan.** Las estadísticas se guardan por partido y se calculan con las funciones RPC: `get_squad_stats`, `get_player_rating_timeline` y `get_season_mvps`. No calcules totales en el frontend si ya existe una RPC que lo hace.
- **Anonimato de los votos.** Ningún código del frontend debe intentar leer los votos de otros jugadores. Las medias solo se muestran cuando la votación del partido está cerrada (7 días desde la fecha del partido).
- **Cambios de esquema:** crea siempre un archivo nuevo en `supabase/migrations/`. Nunca edites una migración que ya se haya aplicado.
- La seguridad la garantiza RLS en la base de datos, no el frontend. Ocultar un botón en React no basta.
- Nunca subas `.env` a git. Variables: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- Nunca ejecutes `seed.sql` en el proyecto de producción.
- No pongas correos personales en archivos del repositorio.

## Comandos
- `npm run dev` — servidor de desarrollo (http://localhost:5173)
- `npm run build` — build de producción (genera también el service worker de la PWA)
- `npm run preview` — sirve el build para probar la PWA
- `npm run lint` — oxlint
