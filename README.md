<p align="center">
  <img src="public/escudo.png" alt="Escudo de Springfield FS" width="150">
</p>

<h1 align="center">Springfield FS · Estadísticas</h1>

<p align="center">
  PWA para que el equipo de fútbol sala <strong>Springfield FS</strong> (Torrejón de Ardoz) registre y consulte las estadísticas de sus jugadores.
</p>

<p align="center">
  <a href="https://github.com/cesar170303/springfield-fs/actions/workflows/ci.yml"><img src="https://github.com/cesar170303/springfield-fs/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/versi%C3%B3n-0.3.0-blue" alt="Versión 0.3.0">
  <a href="LICENSE"><img src="https://img.shields.io/badge/licencia-MIT-green" alt="Licencia MIT"></a>
  <img src="https://img.shields.io/badge/React-Vite-61dafb" alt="React + Vite">
  <img src="https://img.shields.io/badge/Tailwind-CSS-38bdf8" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Supabase-Postgres-3ecf8e" alt="Supabase">
</p>

---

## ¿Qué es?

Springfield FS juega en la Primera División de la Liga Local. Esta app sustituye a las hojas de cálculo: el admin registra cada partido y los jugadores consultan sus números y votan la actuación de sus compañeros.

> **Estado:** en desarrollo (v0.3.0). Todavía no hay versión desplegada ni capturas; el diseño visual se decide cuando el flujo funcione.

## Funcionalidades

- **Estadísticas por jugador y partido:** goles, asistencias, minutos y tarjetas.
- **Valoración media** votada por los compañeros, con nota de 1 a 10 en medios puntos.
- **Votación anónima:** nadie puede ver el voto de otro. Las medias solo se muestran cuando la votación del partido está cerrada (7 días después del partido).
- **MVP de temporada.**
- **Gráfica de la valoración** del jugador a lo largo de la temporada.
- **Apodo como nombre principal** (los jugadores se conocen por apodos de Los Simpson).
- **Roles** (`superadmin`, `admin`, jugador) aplicados en la base de datos.
- **Instalable como PWA** en el móvil.

Las decisiones de producto completas están en [`docs/SPEC.md`](docs/SPEC.md).

## Tecnologías

| Capa | Tecnología |
| --- | --- |
| Frontend | React + Vite + Tailwind CSS (JavaScript con JSX) |
| PWA | `vite-plugin-pwa` |
| Backend | Supabase: Postgres, Auth (email y Google), Storage y RLS |
| Tests | Vitest + React Testing Library |
| Lint | oxlint |
| Hosting | Vercel (pendiente) |

## Puesta en marcha

### Requisitos

- Node.js y npm
- Un proyecto de Supabase **de desarrollo**

### Pasos

1. Clona el repositorio e instala las dependencias:

   ```bash
   git clone https://github.com/cesar170303/springfield-fs.git
   cd springfield-fs
   npm install
   ```

2. Copia la plantilla de variables y rellénala con los datos de tu proyecto de Supabase:

   ```bash
   cp .env.example .env
   ```

   ```env
   VITE_SUPABASE_URL=
   VITE_SUPABASE_ANON_KEY=
   ```

   > `.env` está en `.gitignore`. **Nunca lo subas al repositorio.**

3. Prepara la base de datos en el **SQL Editor** de Supabase (no se usa la CLI):
   1. Ejecuta `supabase/migrations/20261114120000_initial_schema.sql`, una sola vez.
   2. Activa Google en *Authentication → Providers*.
   3. Pon `http://localhost:5173` como *Site URL*.
   4. Convierte a tu usuario en `superadmin` (detalle en [`docs/SPEC.md`](docs/SPEC.md) §9).
   5. Opcional, **solo en desarrollo**: carga datos de prueba con `supabase/seed.sql`. **Nunca lo ejecutes en producción.**

4. Arranca la app:

   ```bash
   npm run dev
   ```

   Se abre en http://localhost:5173.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción (genera también el service worker) |
| `npm run preview` | Sirve el build para probar la PWA |
| `npm run lint` | Lint con oxlint |
| `npm test` | Tests (una pasada) |
| `npm run test:watch` | Tests en modo vigilancia |
| `npm run test:coverage` | Tests con informe de cobertura |

El CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) ejecuta lint, tests con cobertura y build en cada PR y en `main`.

## Arquitectura

El frontend sigue **Clean Architecture** en tres capas. Las dependencias solo apuntan hacia dentro (`infrastructure → application → domain`) y oxlint hace fallar `npm run lint` si se rompe la regla. Decisión completa en [`docs/adr/0001-clean-architecture.md`](docs/adr/0001-clean-architecture.md).

```
src/
├── domain/           Reglas puras: apodo, nota 1–10, votación abierta/cerrada, rol
├── application/      Casos de uso y ports (contratos con JSDoc)
└── infrastructure/
    ├── supabase/     Cliente, repositorios y mappers
    ├── ui/           Componentes React, hooks y contexto de sesión
    └── composition.js  Crea los repositorios y los inyecta
```

Reglas del proyecto:

- **Los totales nunca se guardan.** Se guardan los datos por partido y se calculan con las RPC `get_squad_stats`, `get_player_rating_timeline` y `get_season_mvps`.
- **La seguridad la garantiza RLS** en la base de datos, no el frontend.
- **Cambios de esquema:** siempre con una migración nueva en `supabase/migrations/`; nunca se edita una ya aplicada.
- **TDD:** toda feature, cambio de comportamiento o arreglo empieza con un test que falla.

## Estado y hoja de ruta

Orden de trabajo definido en [`docs/SPEC.md`](docs/SPEC.md) §10:

- [x] 1. Proyecto base (Vite + React + Tailwind + PWA)
- [x] 2. Cliente de Supabase, login (email + Google) y contexto de sesión con rol
- [ ] 3. Lista de la plantilla (`get_squad_stats`) con selector de temporada y filtro de competición
- [ ] 4. Ficha del jugador y gráfica de valoración
- [ ] 5. Panel de admin
- [ ] 6. Pantalla de votación
- [ ] 7. Rankings
- [ ] 8. Notificaciones push
- [ ] 9. Despliegue en Vercel

Pendiente también: escudo en alta resolución (hacen falta iconos de 192 y 512 px para que Chrome ofrezca "instalar").

El historial de versiones está en [`CHANGELOG.md`](CHANGELOG.md).

## Documentación

- [`docs/SPEC.md`](docs/SPEC.md): especificación y decisiones de producto
- [`docs/adr/`](docs/adr/): decisiones de arquitectura
- [`CHANGELOG.md`](CHANGELOG.md): cambios por versión y fallos conocidos

## Licencia

El código se distribuye bajo la licencia [MIT](LICENSE).

La licencia cubre **solo el código**. El escudo (`public/escudo.png`) y el nombre y la marca «Springfield FS» pertenecen al club y no se pueden reutilizar libremente.
