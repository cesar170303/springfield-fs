# Auditoría de seguridad del backend — noviembre 2026

**Fecha:** 2026-11-18 · **Alcance:** esquema de Supabase tras las migraciones `20261114120000_initial_schema` y `20261118120000_final_votes_and_guest_voters` · **Entorno:** Supabase local (nada se ha probado contra la nube).

> Todos los hallazgos elegidos están corregidos y aplicados en la nube desde el 2026-11-19 (migraciones `20261118120000` y `20261118130000`).

## Cómo se ha revisado
- `supabase db advisors --type security`: **sin avisos**.
- Revisión manual de RLS, permisos de tablas y funciones, triggers de Auth y Storage.
- Cada hallazgo marcado como «Demostrado» se ha reproducido en local dentro de una transacción deshecha, con los jugadores ficticios del seed.

## Resumen

| # | Gravedad | Hallazgo | Estado |
|---|---|---|---|
| 1 | **Alta** | Cualquier registrado lee el correo de todos los jugadores | **Corregido** |
| 2 | **Alta** (si la confirmación de correo está desactivada) / Media | Suplantación de ficha registrándose con el correo de un jugador sin confirmarlo | **Corregido** (requiere confirmación activada en la nube) |
| 3 | Media (funcional) | El admin no puede cambiar ni borrar fotos | **Corregido** |
| 4 | Media | Las fotos son públicas sin iniciar sesión | **Aceptado**: se mantienen públicas; spec corregida |
| 5 | Media | Borrar una cuenta o una ficha borra sus votos y cambia medias ya cerradas | **Corregido**: no se puede borrar una cuenta con votos |
| 6 | Baja | Permisos sobrantes en tablas (`TRUNCATE`, `TRIGGER`, `REFERENCES`) | **Corregido** |
| 7 | Baja | Funciones auxiliares ejecutables por usuarios anónimos; una sin uso | **Corregido** |
| 8 | Info | Política de contraseñas y confirmación de correo | **Corregido** en la nube (sin protección de contraseñas filtradas: requiere plan de pago) |
| 9 | Info | Con muy pocos votantes, la media puede delatar una nota | **Aceptado**: la media se muestra siempre |

## Hallazgos

### 1. Alta — Correos de los jugadores visibles para cualquier registrado
- **Qué pasa:** la política «Registrados leen» de `players` deja leer **todas** las columnas, incluida `email`. El registro es abierto, así que cualquiera de internet puede crear una cuenta y pedir `GET /rest/v1/players?select=nickname,email`.
- **Demostración:** un usuario recién registrado obtuvo los 8 correos de la plantilla del seed.
- **Impacto:** fuga de datos personales de todo el equipo, en contra de la regla del proyecto sobre correos.
- **Arreglo propuesto:** quitar a `authenticated` el permiso de lectura de la columna `email` (permisos por columna) y que el staff lo lea con una RPC solo para staff. El frontend tendrá que pedir columnas concretas en lugar de `select *`.

### 2. Alta / Media — Suplantación de ficha con un correo sin confirmar
- **Qué pasa:** `handle_new_user` vincula la ficha en cuanto se crea la fila en `auth.users`, y Supabase la crea al registrarse, **antes** de confirmar el correo. Lo mismo hace `link_player_to_user` al crear una ficha.
- **Demostración:** una cuenta con `email_confirmed_at = null` quedó vinculada a la ficha nueva y con rol `player`.
- **Impacto:**
  - Con la confirmación de correo **desactivada**, cualquiera que conozca el correo de un fichaje nuevo se queda con su ficha, vota por él y bloquea al jugador real.
  - Con la confirmación activada, el atacante no puede entrar sin acceso al buzón, pero la ficha queda atada a su cuenta. Si el jugador pulsa el enlace de confirmación que recibe, confirma la cuenta que creó el atacante.
- **Arreglo propuesto:** vincular la ficha **solo cuando el correo esté confirmado**: en el alta si ya viene confirmado (Google) y, si no, al confirmarse (trigger sobre `email_confirmed_at`). `link_player_to_user` solo vincula cuentas confirmadas.
- **Nota:** en esta conversación se sugirió desactivar la confirmación para desarrollar más cómodo. En la nube **debe seguir activada**.

### 3. Media (funcional) — El admin no puede cambiar ni borrar fotos
- **Qué pasa:** `storage.objects` tiene políticas de `insert`, `update` y `delete` para el bucket `player-photos`, pero **ninguna de `select`**. En Postgres, `update` y `delete` solo ven las filas que permite la política de lectura, así que no encuentran ninguna.
- **Impacto:** el admin sube una foto pero no puede reemplazarla ni borrarla desde la app.
- **Arreglo propuesto:** política de `select` en `storage.objects` para el bucket (al menos para el staff). El test `07_storage` ya lo cubre (marcado como TODO).

### 4. Media — Fotos públicas sin sesión
- **Qué pasa:** `player-photos` es un bucket público: cualquiera con la URL ve la foto, sin iniciar sesión. La spec dice a la vez «sin registro no se ve nada» (§2) y «bucket público» (§8).
- **Decisión:** mantenerlo público (URLs directas, más simple y rápido) o hacerlo privado (URLs firmadas que caducan; más trabajo en el frontend).

### 5. Media — Borrar una cuenta o una ficha cambia el pasado
- **Qué pasa:** `votes.voter_id` y `votes.rated_id` borran en cascada. Si se elimina la cuenta de un votante, desaparecen todos sus votos y **cambian medias y MVP de partidos ya cerrados**.
- **Arreglo propuesto:** impedir borrar cuentas o fichas con votos (`on delete restrict`) y usar el archivado, que ya existe para jugadores. Alternativa: conservar los votos anónimos (`voter_id` a null) al borrar la cuenta.

### 6. Baja — Permisos sobrantes en las tablas
- **Qué pasa:** `anon` y `authenticated` tienen `TRUNCATE`, `TRIGGER` y `REFERENCES` en todas las tablas de `public` (permisos por defecto de Supabase). `TRUNCATE` **se salta RLS**.
- **Impacto hoy:** ninguno directo, porque la API REST no puede ejecutar `TRUNCATE`. Es defensa en profundidad por si algún día hay una vía (función, extensión).
- **Arreglo propuesto:** revocarlos en todas las tablas (en `votes` ya se hizo).

### 7. Baja — Funciones auxiliares ejecutables por anónimos
- **Qué pasa:** `app_role`, `is_staff`, `is_superadmin` y `current_player_id` son `security definer` y las puede llamar un visitante sin sesión. Hoy devuelven `null` o `false` para él, así que no filtran nada. `current_player_id` ya no la usa nadie.
- **Arreglo propuesto:** revocar `execute` a `anon` y borrar `current_player_id`.

### 8. Info — Contraseñas y confirmación de correo
- El login acepta contraseñas de 6 caracteres (el mínimo de Auth). Recomendado: 8 o más y, si el plan de Supabase lo permite, la comprobación de contraseñas filtradas.
- Mantener activada la confirmación de correo en la nube (ver hallazgo 2).

### 9. Info — Anonimato con pocos votantes
- Si en un partido votan muy pocos a un jugador (por ejemplo, 1 o 2), su media cerrada puede delatar la nota concreta a quien sepa quién votó.
- **Decisión posible:** no mostrar la media de un partido con menos de N votos (p. ej. 3).

## Lo que está bien
- RLS activado en **todas** las tablas de `public`; las vistas con medias viven en `private`, que ni `anon` ni `authenticated` pueden usar.
- Nadie, ni el admin ni el superadmin, lee votos ajenos; las medias solo salen con la votación cerrada (tests `05`).
- Funciones `security definer` con `search_path` vacío; las RPC de estadísticas y `can_vote` no son ejecutables por anónimos.
- Votos definitivos: sin política ni permiso de cambio o borrado (test `04`).
- Solo el superadmin cambia roles; nadie puede subirse el suyo (test `01`).

## Correcciones (2026-11-18)
Migración `20261118130000_security_hardening.sql`, con tests en rojo antes y en verde después (`02_player_link`, `07_storage`, `08_hardening`):
- **1:** `email` fuera de los permisos de lectura de `players`; el staff lo lee con `get_player_emails()`.
- **2:** la ficha solo se vincula a cuentas con el correo confirmado (al registrarse, al confirmar o al crear la ficha). **Solo protege si la confirmación de correo está activada en la nube**: con ella desactivada, Supabase da el correo por confirmado al registrarse.
- **3:** política de lectura de `storage.objects` para el staff en `player-photos`.
- **5:** `votes.voter_id` con `on delete restrict`.
- **6:** fuera `TRUNCATE`, `TRIGGER` y `REFERENCES` para `anon` y `authenticated`, también en tablas futuras.
- **7:** funciones auxiliares sin `execute` para anónimos; funciones de trigger sin `execute` para nadie; `current_player_id` eliminada.

Tras corregir: `supabase db advisors` (seguridad y rendimiento) sin avisos; la demostración 1 da `permission denied` y la 2 la cubre el test `02_player_link`.

**Aplicado en la nube (2026-11-19):** las dos migraciones nuevas, comprobadas con una consulta (`season_voters` y `get_player_emails()` existen, `current_player_id` ya no, `votes.voter_id` es `uuid`). En Auth: confirmación de correo activada y contraseña mínima de 8 caracteres. La protección de contraseñas filtradas no está disponible en el plan gratuito de Supabase; se revisará si se cambia de plan.
