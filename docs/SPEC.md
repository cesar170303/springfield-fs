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
| `viewer` | Registrado sin ficha de jugador. Consulta todo; vota solo si el staff lo elige como votante de esa temporada |

- Login con email y con **Google** (Supabase Auth).
- **Registro abierto**: cualquiera que se registre puede ver la app ("no hay nada que ocultar"). Sin registro no se ve nada, salvo las fotos de los jugadores si se tiene su URL (ver §8).
- **El correo de los jugadores solo lo ve el staff** (RPC `get_player_emails`); el resto de la ficha la ve cualquier registrado.
- **La confirmación de correo debe estar activada** en el proyecto de la nube: sin ella, cualquiera podría registrarse con el correo de un jugador y quedarse con su ficha.
- **El admin crea la ficha del jugador** con su email. Cuando ese email se registra **y se confirma**, un trigger vincula la cuenta a la ficha y le da el rol `player` (con Google el correo ya viene confirmado). Funciona también si el jugador se registra antes de que exista la ficha. Una cuenta sin confirmar nunca se vincula.
- Todos ven la lista completa de la plantilla y las fichas de todos.

## 3. Temporadas y competiciones

- **Un solo equipo** (sin multi-tenant).
- **Varias temporadas** con selector (2026/27…). El **dorsal es por temporada**.
- **Varias competiciones** (`league`, `cup`, `friendly`). Las reales son **Primera División Liga Local** (`league`) y **Copa** (`cup`):
  - La lista principal muestra la **suma de todas**.
  - Hay un **filtro** para ver solo una competición (p. ej., 1 gol en copa + 1 en liga = 2 en la lista).
- Los partidos de copa **también llevan número de jornada**, pero siempre se distingue que son de copa (etiqueta "Copa J2").
- Cuando un jugador deja el equipo, **se archiva**: no se borra y conserva su historial.
- **Una cuenta que ha votado no se puede borrar**, para que no cambien medias ni MVP de partidos ya cerrados.

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

### Pantalla de la plantilla

Decidida el 2026-11-21 con dos referencias del propietario (FotMob y BeSoccer). Los datos salen de `get_squad_stats`.

- **Arriba:** selector de temporada y filtro de competición (todas, liga o copa).
- **Vista inicial, tarjetas de líderes:** una tarjeta por estadística con los 3 mejores de la plantilla; el primero lleva la cifra en una pastilla.
  - Tarjetas, en este orden: **Goleadores, Asistencias, Goles + asistencias, Valoración media, MVPs y Tarjetas**.
  - Tarjetas: amarillas y rojas dibujadas con su forma y su número; ordenadas por rojas y después por amarillas.
  - No aparece quien tiene 0 en esa estadística ni, en la valoración, quien no tiene nota.
- **Botón arriba a la derecha:** «Mostrar como lista» ↔ «Mostrar como tarjetas».
- **Vista lista:** cada fila con dorsal en recuadro, foto y apodo.
  - Por defecto, ordenada por dorsal y agrupada por posición (Portero, Cierre, Ala, Pívot, Universal).
  - Se puede ordenar por goles, asistencias, valoración, MVPs, partidos o tarjetas: entonces es una lista única, sin grupos, de mayor a menor (empate: por dorsal).
  - Columnas: partidos jugados, goles (al portero, encajados), asistencias, tarjetas y valoración media.
- **Al pulsar un jugador** se abre su ficha (paso 4), a pantalla completa en `/jugador/:id`, con la misma temporada y competición.

### Navegación

Decidida el 2026-11-22 (ADR-0004): React Router con URLs reales (el «atrás» del móvil vuelve a la pantalla anterior), filtros de la plantilla en la URL (`?temporada=&competicion=`) y una **barra inferior fija** que hoy tiene Plantilla y Salir, y crecerá con Votar, Rankings y Admin (solo staff).

## 6. Valoración (votación anónima)

- La valoración la ponen **los compañeros**, con **voto anónimo**.
- Escala **1–10 con medios puntos** (7, 7.5, 8…).
- **Votan los jugadores de la plantilla de esa temporada** (vinculados a una ficha activa y no archivada).
- **Viewers votantes:** el superadmin y los admins pueden elegir, **por temporada**, qué viewers votan (aficionados que van siempre a los partidos). Su voto **pesa igual** que el de un jugador y es igual de anónimo. Un viewer no elegido no vota.
- Solo se puede votar a quien **jugó al menos 1 minuto**. **Sin autovoto**.
- La votación está abierta **7 días desde la fecha del partido** (valor fijo).
- **Cada voto es definitivo:** una vez emitido no se puede cambiar ni borrar (para evitar amiguismos). Se puede votar a unos compañeros un día y al resto otro, mientras la votación siga abierta.
- Las **medias solo se muestran cuando la votación está cerrada**. Así nadie puede deducir el voto de otro viendo cómo cambia la media.
- **MVP** = mejor media del partido. Si hay empate, el admin lo resuelve (`mvp_override_player_id`).
- Anonimato: la tabla guarda `voter_id` (la **cuenta** del votante, para impedir votos dobles), pero RLS impide que nadie, ni el admin, lea votos ajenos desde la app.

### Pantalla de votación

Decidida el 2026-11-20 con un prototipo interactivo. Usa solo la paleta del modo votación (§11).

- **Cuándo se entra:** con la votación de un partido abierta y algún compañero pendiente, desde el aviso «Votación abierta» (§8) o desde el inicio de la app.
- **Una tarjeta por compañero pendiente:** jugó al menos 1 minuto, no eres tú y aún no le has votado. Salen en **orden aleatorio**, distinto cada vez que se abre la votación.
- **Qué muestra la tarjeta:**
  - A la izquierda: la foto (sin foto, el dorsal en grande), el apodo y la posición.
  - **A la derecha, a la altura del apodo y en grande:** sus datos de ese partido, es decir, los minutos y, si los hay, goles y asistencias. Al portero, los goles encajados.
- **La nota:**
  - Barra de 1 a 10 en saltos de 0,5: control nativo, usable con teclado y lector de pantalla. Sin botones de ±0,5.
  - **Empieza sin nota** («—»): no se puede votar sin elegirla.
  - Se escribe con coma («7,5»).
- **Votar,** con el botón «Aceptar nota» o **deslizando la tarjeta a la derecha:**
  - La tarjeta sale por la derecha y entra la siguiente.
  - Durante **5 segundos** se puede **deshacer**. Al acabar la cuenta atrás, la nota se envía y desde ese momento es definitiva.
  - Sin nota elegida, la tarjeta vuelve a su sitio y lo avisa.
- **Saltar por ahora,** con el botón «Saltar por ahora» o **deslizando la tarjeta a la izquierda:** el compañero pasa al final de la fila. Si es el último, la tarjeta vuelve a su sitio y lo avisa.
- **El gesto:**
  - La tarjeta sigue al dedo y, al pasar un umbral, muestra «Votar 7,5» o «Saltar». Si se suelta antes, vuelve a su sitio.
  - El gesto no empieza sobre la barra ni sobre los botones, para no confundir mover la nota con deslizar la tarjeta.
  - Los botones hacen lo mismo, para quien no use gestos.
- **Progreso:** «3 de 8» y una marca por cada tarjeta.
- **Al terminar:** «Has votado a todos», cuándo se publican las medias (al cerrarse la votación, 7 días desde el partido) y tus notas, que solo ves tú.
- **Si sales a medias,** los que faltan siguen pendientes mientras la votación esté abierta.
- **Si falla el envío,** se avisa y el compañero vuelve a la fila: nada cuenta como votado sin la confirmación de la base de datos.

## 7. Ficha del jugador y su gráfica

Decidida el 2026-11-22 sobre una maqueta aprobada por el propietario (vistas a 360 px y a 1280 px).

- **Dónde:** `/jugador/:id`, a pantalla completa, con la temporada y la competición de la plantilla (los selectores también están en la ficha). Si el jugador no está en la plantilla de esa temporada, se dice.
- **Cabecera:** foto (sin foto, sus iniciales), apodo en grande, nombre real y dorsal, posición y estado (disponible, lesionado o sancionado). De fondo, el dorsal enorme: relleno gris, contorno más claro y difuminado hacia abajo.
- **Valoración media:** medidor de media luna de 1 a 10 y cuántos partidos la forman. Sin votaciones cerradas, «–».
- **Seis cifras:** partidos jugados (de cuántas convocatorias), minutos (y por partido), goles (cuántos de penalti; destacada en azul), asistencias (y goles + asistencias), MVP y tarjetas. Al portero, goles encajados y porterías a cero (destacada) en lugar de goles y asistencias.
- **Gráfica «Partido a partido»** (SVG propio, sin librería):
  - Eje X: **un punto por partido** con la votación cerrada (etiquetas "J5", "Copa J2"…; con muchos partidos, solo algunas).
  - Tres líneas: **nota de cada partido**, **media acumulada** y **media del equipo** en ese partido. La escala va de un punto por debajo del valor más bajo hasta 10.
  - Al pasar el ratón o el dedo, los datos de ese partido. «Ver como tabla» da lo mismo en una tabla.
  - Siempre de todas las competiciones (la RPC no filtra por competición); si hay un filtro, se avisa.
  - Datos: RPC `get_player_rating_timeline(p_player_id, p_season_id)`.
- **Últimos partidos:** los 4 más recientes («Ver todos los partidos» enseña el resto): rival, minutos, goles, asistencias (al portero, encajados), MVP y la nota. Con la votación abierta, «Votación abierta hasta el …». Datos: RPC `get_player_match_log(p_player_id, p_season_id, p_competition_id)`.
- **Movimiento** (§11): el apodo entra letra a letra; cada bloque sube al aparecer en pantalla, con las cifras rodando, el medidor llenándose y la gráfica dibujándose de izquierda a derecha (inspirado en una referencia del propietario).
- No se enseña la media del equipo de toda la temporada: ninguna RPC la da y calcularla en el frontend iría contra la regla de los totales.

## 8. Otras funcionalidades

- **Rankings**: máximo goleador, máximo asistente, mejor valorado (con un mínimo de partidos valorados; usar `rated_matches`) y más MVPs.
- **Notificaciones push** (Web Push). Solo llegan a quien las ha activado en su dispositivo. Nota: en iPhone solo funcionan si la PWA está añadida a la pantalla de inicio.

  | Aviso | Cuándo | A quién |
  |---|---|---|
  | **Votación abierta** | Al marcar el partido como terminado (mientras siga abierta la votación) | Votantes de esa temporada: plantilla no archivada y viewers elegidos |
  | **Queda 1 día** | Entre el día 6 y el 7 desde la fecha del partido | Solo los votantes a los que **les falta algún compañero** que jugó ≥1 minuto (sin contarse a sí mismos) |
  | **MVP del partido** | Al cerrarse la votación (día 7), hasta 24 h después | **Todos los registrados** con notificaciones activas |

  - Cada aviso se envía **una sola vez** por partido. Una tarea programada (`pg_cron`, cada 15 minutos) lo comprueba, así que puede llegar hasta 15 minutos tarde.
  - El recordatorio usa **si** alguien ha votado, nunca **qué** ha votado.
  - Los partidos cerrados hace más de 24 h no generan aviso de MVP (evita una avalancha al activar las notificaciones por primera vez).
- **Sin modo offline** para editar. Siempre con conexión.
- **Sin exportación** a PDF/Excel.
- **Fotos**: solo las suben, cambian o borran el admin y el superadmin. Bucket **público** `player-photos` (máx. 2 MB; webp/jpeg/png): se ven por URL directa sin iniciar sesión, por decisión expresa (más simple y rápido que URLs firmadas).

## 9. Backend implementado (`supabase/migrations/20261114120000_initial_schema.sql`)

### Tablas
`profiles`, `seasons`, `competitions`, `players`, `player_seasons`, `matches`, `match_squad`, `goals`, `missed_penalties`, `votes`, `push_subscriptions`.

### Funciones RPC para el frontend
```js
supabase.rpc('get_squad_stats', { p_season_id, p_competition_id: null }) // null = todas
supabase.rpc('get_player_rating_timeline', { p_player_id, p_season_id })
supabase.rpc('get_season_mvps', { p_season_id })
supabase.rpc('get_player_match_log', { p_player_id, p_season_id, p_competition_id: null }) // 20261122120000
```
`get_player_match_log` da los partidos terminados en los que jugó (≥1 minuto), del más reciente al más antiguo: etiqueta, rival, minutos, goles, asistencias, goles encajados (portero), nota y MVP (solo con la votación cerrada) y fecha de cierre de la votación.
`get_squad_stats` devuelve por jugador: dorsal, apodo, posición, estado, foto, convocatorias, PJ, minutos, goles, asistencias, goles de penalti, penaltis fallados, amarillas, rojas, valoración media, partidos valorados, MVPs, goles encajados y porterías a cero (estas dos solo para porteros).

### Validaciones en la base de datos (triggers y constraints)
- Solo se puede convocar a jugadores de la plantilla de esa temporada.
- No se puede marcar un gol (ni asistir) con 0 minutos jugados.
- No puede haber más goles registrados que `goals_for`, ni bajar `goals_for` por debajo de los goles ya registrados.
- Minutos de 0 a 40, notas solo en medios puntos y sin autovoto.

### Probado
31 pruebas en PostgreSQL 16 con una imitación de Supabase Auth: permisos por rol, vínculo de usuarios con fichas, anonimato, cierre de votación, empate de MVP, jugador archivado y cálculos de totales, filtros y gráfica.

### Puesta en marcha
1. Aplicar en orden todas las migraciones de `supabase/migrations/` (SQL Editor, una sola vez cada una).
2. Activar Google en Authentication → Providers.
3. Site URL `http://localhost:5173` mientras se desarrolla; añadir la URL de Vercel al desplegar.
4. Crear el usuario del propietario y ejecutar:
   `update public.profiles set role = 'superadmin' where email = '<correo del propietario>';`
5. **Notificaciones push** (una vez por proyecto; los valores nunca van al repo):
   - En el SQL Editor, guardar en Vault la URL del proyecto y la clave `service_role`:
     `select vault.create_secret('https://<ref>.supabase.co', 'project_url');` y `select vault.create_secret('<clave service_role>', 'secret_key');`
   - Generar claves VAPID (`npx web-push generate-vapid-keys`) y guardarlas como *secrets* de Edge Functions: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT` (`mailto:` de contacto o URL de la app).
   - Desplegar la función: `npx supabase functions deploy send-push --no-verify-jwt`.
   - La clave pública VAPID la necesitará la PWA para suscribirse (frontend).

## 10. Pendiente

### Decisiones abiertas
- [x] Pabellón (`venue`) y local/visitante (`is_home`) en `matches`: **decidido no añadirlos por ahora** (2026-11-19). Si se retoma, con una migración nueva.
- [x] Nombre real de las competiciones: **Primera División Liga Local** y **Copa**.
- [x] Escudo en alta resolución: `public/escudo-hd.png` (1024×1024); los iconos de la PWA se generan con `npm run icons`.
- [x] Diseño visual: **decidido** el 2026-11-20 (ver §11).

### Por construir
- [x] Edge Function para enviar Web Push y tarea programada (`pg_cron`) para los avisos (backend; falta la suscripción desde la PWA).

### Orden de trabajo sugerido
1. Crear el proyecto Vite + React + Tailwind + `vite-plugin-pwa`.
2. Cliente de Supabase, login (email + Google) y contexto de sesión con el rol del usuario.
3. Lista de la plantilla (`get_squad_stats`) con selector de temporada y filtro de competición (ver §5, «Pantalla de la plantilla»).
4. Ficha del jugador: estadísticas grandes y ordenadas, más la gráfica (SVG propio, sin librería; decidido el 2026-11-22). Hecha en 0.11.0 (§7), tras la navegación entre pantallas (0.10.0, ADR-0004).
5. Panel de admin: temporadas, jugadores (con foto), plantilla y dorsales, partidos, convocatoria y minutos, goles, tarjetas, penaltis fallados, cerrar partido y desempatar MVP.
6. Pantalla de votación para jugadores (ver §6, «Pantalla de votación»).
7. Rankings.
8. Notificaciones push.
9. Despliegue en Vercel.

### Ideas para más adelante
- Generar automáticamente las imágenes de "Convocatoria" y "Resultado final" para Instagram a partir de los datos de la app.

## 11. Diseño visual

Decidido el 2026-11-20 a partir de dos referencias: [Kopetzki](https://www.awwwards.com/sites/kopetzki) y [DeepBook](https://www.awwwards.com/sites/deepbook) (Awwwards). Los ejemplos visuales están en el sistema de diseño del propietario (privado). Lo que manda está aquí y, en el código, en los tokens de `src/index.css`.

### Color

Toda la app es negra, blanca y gris, con el **azul eléctrico** como único color de datos, acciones y lo destacado, igual en todas las pantallas: la pastilla del líder, la cifra destacada de la ficha y la nota de los partidos en que fue MVP (decidido el 2026-11-23). El amarillo queda solo para las tarjetas amarillas y la votación. Los dorsales de la lista van en una pastilla azul, como la del líder.

| Token | Color | Para qué |
|---|---|---|
| `bg` | `#000000` | Fondo de todas las pantallas |
| `surface` | `#121417` | Tarjetas y filas destacadas |
| `line` | `#262626` | Líneas finas entre filas (decorativas) |
| `border` | `#6a7681` | Bordes de campos, chips y botones secundarios |
| `text` / `text-muted` | `#ffffff` / `#8a96a3` | Texto principal y secundario |
| `accent` | `#1e6ef3` | Acción principal (con texto blanco), chip seleccionado, pastilla del líder y del dorsal, cifra destacada, medidor, gráfica y foco |
| `accent-text` | `#4d8ef7` | Enlaces, texto azul pequeño y nota de MVP |
| `danger` | `#ff4d4f` | Errores (siempre con una frase) y tarjeta roja |
| `card-yellow` | `#ffd90f` | Tarjeta amarilla |

**Modo votación** (paleta «Donut»): solo en la pantalla de votación.

| Token | Color | Para qué |
|---|---|---|
| `vote-surface` | `#1e1e1e` | Tarjeta y hueco de la foto |
| `vote-border` | `#767676` | Pista de la barra y bordes |
| `vote-primary` | `#ffd90f` | «Aceptar nota» y la barra |
| `vote-rating` | `#ff5fa2` | La nota que se está poniendo |
| `vote-accent` | `#4cc3ff` | El dorsal |
| `vote-on` | `#000000` | Texto sobre amarillo, rosa o azul cielo |

Todas las combinaciones de texto cumplen WCAG AA: 4,5:1, y 3:1 en texto grande, bordes y foco. Las tarjetas amarilla y roja se dibujan siempre con su forma y su número, no solo con el color.

### Tipografía

- **Archivo** (gratuita y variable). Estrecha (ancho 62,5 %, peso 800) para titulares, cifras (tabulares) y apodos; a ancho normal para el resto.

### Movimiento

- **Cinco animaciones, con GSAP:**
  - en la entrada (el login), un campo de rayitas verticales que suben por curvas, al estilo de DeepBook, con destellos azules (decidido el 2026-11-21);
  - los titulares, letra a letra;
  - las cifras, que ruedan hasta su valor;
  - la ficha, que avanza con el scroll;
  - la tarjeta de votación, que sigue al dedo y sale deslizándose al votar (derecha) o al saltar (izquierda).
- Solo se animan la posición y la opacidad. Con «reducir movimiento» activado en el dispositivo, nada se mueve.
- Lo que se mueva más de 5 s seguidos lleva un botón para pararlo (WCAG 2.2.2), como el campo de rayitas del login.

### Motivo

- Las rayas verticales del escudo: rayitas finas y grises que fluyen, alguna en azul.
