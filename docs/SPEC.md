# Especificación — Springfield FS Stats

Documento de decisiones acordadas el 14/11/2026. Fuente de verdad del producto.

---

## 1. El equipo

- **Springfield FS**, equipo de **fútbol sala** de Torrejón de Ardoz (Madrid).
- Juega la **Primera División de la Liga Local**. Patrocinador: Barcalatra.
- Instagram: @springfieldfs_
- Partidos de **2 partes de 20 minutos (40')**, **sin prórroga**.
- **Los jugadores se conocen por apodos** de Los Simpson (HOMER, BART, APU, APU JR, LENNY, CLETUS, WIGGUM, SKINNER, RALPH, BOB…). En la app, **el apodo es el nombre principal** y el nombre real va en pequeño.
- Estética actual del club: fondo negro, blanco y acentos dorados o amarillos. Escudo en blanco y negro con temática Simpson.
- Publicaciones habituales en Instagram: "Convocatoria" (dorsal + apodo), "Match Day" (rival, pabellón, fecha y hora), "Resultado final" (jornada, marcador, goleadores) y "MVP" por temporada.
- Todos los jugadores son **mayores de edad**.

## 2. Usuarios, roles y acceso

| Rol | Qué puede hacer |
|---|---|
| `superadmin` | Propietario del proyecto. Todo, incluido cambiar roles |
| `admin` | Gestiona temporadas, jugadores, partidos, estadísticas y fotos |
| `player` | Consulta todo y **vota** a sus compañeros. No edita nada más (tampoco su foto) |
| `viewer` | Registrado sin ficha de jugador. Solo consulta |

- Login con email y con **Google** (Supabase Auth).
- **Registro abierto**: cualquiera que se registre puede ver la app ("no hay nada que ocultar"). Sin registro no se ve nada.
- **El admin crea la ficha del jugador** con su email. Cuando ese email se registra, un trigger vincula la cuenta a la ficha y le da el rol `player`. Funciona también si el jugador se registra antes de que exista la ficha.
- Todos ven la lista completa de la plantilla y las fichas de todos.

## 3. Temporadas y competiciones

- **Un solo equipo** (sin multi-tenant).
- **Varias temporadas** con selector (2026/27…). El **dorsal es por temporada**.
- **Varias competiciones** (`league`, `cup`, `friendly`):
  - La lista principal muestra la **suma de todas**.
  - Hay un **filtro** para ver solo una competición (p. ej., 1 gol en copa + 1 en liga = 2 en la lista).
- Los partidos de copa **también llevan número de jornada**, pero siempre se distingue que son de copa (etiqueta "Copa J2").
- Cuando un jugador deja el equipo, **se archiva**: no se borra y conserva su historial.

## 4. Partidos

- Datos: fecha y hora, rival, resultado (goles a favor y en contra), jornada, competición.
- **Convocatoria**: se registra quién fue convocado. PJ = partidos con al menos 1 minuto.
- **No** se guarda si fue titular o suplente.
- **Minutos**: total a mano por el admin, de 0 a 40 (en sala los cambios son ilimitados, así que entrada y salida no son prácticas).
- El partido se marca como terminado (`is_finished`); eso **abre la votación**.

## 5. Estadísticas por jugador y partido

- **Goles como eventos**: goleador + asistente opcional + tipo (`regular`, `penalty`, `double_penalty`). Un penalti no lleva asistencia.
- **Penaltis y dobles penaltis fallados**: tabla aparte.
- **Tarjetas**: amarilla y roja. **La doble amarilla cuenta solo como 1 roja** (sin amarillas).
- **Portero** (solo hay uno): goles encajados y porterías a cero, sacados del resultado del partido cuando jugó.
- Posiciones: `goalkeeper` (portero), `defender` (cierre), `winger` (ala), `pivot` (pívot), `universal`.
- Estado del jugador: `available`, `injured`, `suspended` (lo cambia el admin).
- Ficha: nombre, apellidos, **apodo**, email, posición, estado, foto.

## 6. Valoración (votación anónima)

- La valoración la ponen **los compañeros**, con **voto anónimo**.
- Escala **1–10 con medios puntos** (7, 7.5, 8…).
- **Votan los jugadores de la plantilla de esa temporada** (vinculados a una ficha activa y no archivada). Un `viewer` no vota.
- Solo se puede votar a quien **jugó al menos 1 minuto**. **Sin autovoto**.
- La votación está abierta **7 días desde la fecha del partido** (valor fijo).
- Mientras está abierta, el jugador puede cambiar su voto. No puede borrarlo.
- Las **medias solo se muestran cuando la votación está cerrada**. Así nadie puede deducir el voto de otro viendo cómo cambia la media.
- **MVP** = mejor media del partido. Si hay empate, el admin lo resuelve (`mvp_override_player_id`).
- Anonimato: la tabla guarda `voter_id` (para impedir votos dobles), pero RLS impide que nadie, ni el admin, lea votos ajenos desde la app.

## 7. Gráfica de la ficha del jugador

- Eje X: **un punto por partido** (etiquetas "J5", "Copa J2"…).
- Tres líneas: **nota de cada partido**, **media acumulada** y **media del equipo** en ese partido.
- Datos: RPC `get_player_rating_timeline(p_player_id, p_season_id)`.

## 8. Otras funcionalidades

- **Rankings**: máximo goleador, máximo asistente, mejor valorado (con un mínimo de partidos valorados; usar `rated_matches`) y más MVPs.
- **Notificaciones push** (Web Push): votación abierta, recordatorio de votar antes del cierre, y resultados con el MVP. Nota: en iPhone solo funcionan si la PWA está añadida a la pantalla de inicio.
- **Sin modo offline** para editar. Siempre con conexión.
- **Sin exportación** a PDF/Excel.
- **Fotos**: solo las suben el admin y el superadmin. Bucket público `player-photos` (máx. 2 MB; webp/jpeg/png).

## 9. Backend implementado (`supabase/migrations/20261114120000_initial_schema.sql`)

### Tablas
`profiles`, `seasons`, `competitions`, `players`, `player_seasons`, `matches`, `match_squad`, `goals`, `missed_penalties`, `votes`, `push_subscriptions`.

### Funciones RPC para el frontend
```js
supabase.rpc('get_squad_stats', { p_season_id, p_competition_id: null }) // null = todas
supabase.rpc('get_player_rating_timeline', { p_player_id, p_season_id })
supabase.rpc('get_season_mvps', { p_season_id })
```
`get_squad_stats` devuelve por jugador: dorsal, apodo, posición, estado, foto, convocatorias, PJ, minutos, goles, asistencias, goles de penalti, penaltis fallados, amarillas, rojas, valoración media, partidos valorados, MVPs, goles encajados y porterías a cero (estas dos solo para porteros).

### Validaciones en la base de datos (triggers y constraints)
- Solo se puede convocar a jugadores de la plantilla de esa temporada.
- No se puede marcar un gol (ni asistir) con 0 minutos jugados.
- No puede haber más goles registrados que `goals_for`, ni bajar `goals_for` por debajo de los goles ya registrados.
- Minutos de 0 a 40, notas solo en medios puntos y sin autovoto.

### Probado
31 pruebas en PostgreSQL 16 con una imitación de Supabase Auth: permisos por rol, vínculo de usuarios con fichas, anonimato, cierre de votación, empate de MVP, jugador archivado y cálculos de totales, filtros y gráfica.

### Puesta en marcha
1. Ejecutar la migración en el SQL Editor (una sola vez).
2. Activar Google en Authentication → Providers.
3. Site URL `http://localhost:5173` mientras se desarrolla; añadir la URL de Vercel al desplegar.
4. Crear el usuario del propietario y ejecutar:
   `update public.profiles set role = 'superadmin' where email = '<correo del propietario>';`

## 10. Pendiente

### Decisiones abiertas
- [ ] ¿Añadir a `matches` el **pabellón** (`venue`) y **local/visitante** (`is_home`)? Aparecen en los "Match Day" de Instagram. Si se añaden, hacerlo con una migración nueva.
- [ ] Nombre real de las competiciones (p. ej., "Primera División Liga Local" y el nombre de la copa).
- [ ] Escudo en alta resolución.
- [ ] Diseño visual (se decide cuando el flujo funcione).

### Por construir
- [ ] Edge Function para enviar Web Push y tarea programada (`pg_cron`) para los recordatorios.

### Orden de trabajo sugerido
1. Crear el proyecto Vite + React + Tailwind + `vite-plugin-pwa`.
2. Cliente de Supabase, login (email + Google) y contexto de sesión con el rol del usuario.
3. Lista de la plantilla (`get_squad_stats`) con selector de temporada y filtro de competición.
4. Ficha del jugador: estadísticas grandes y ordenadas, más la gráfica (Recharts o Chart.js).
5. Panel de admin: temporadas, jugadores (con foto), plantilla y dorsales, partidos, convocatoria y minutos, goles, tarjetas, penaltis fallados, cerrar partido y desempatar MVP.
6. Pantalla de votación para jugadores.
7. Rankings.
8. Notificaciones push.
9. Despliegue en Vercel.

### Ideas para más adelante
- Generar automáticamente las imágenes de "Convocatoria" y "Resultado final" para Instagram a partir de los datos de la app.
