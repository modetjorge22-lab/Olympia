# Olympia: estado actual y plan para abrirlo a otros grupos

*Spec generada en entrevista el 12 oct 2026. Autor: Jorge Modet.*

## 1. Qué es Olympia

- **Naturaleza:** side project / hobby. No es un negocio ni tiene relación con el CPG de salud 2027 (proyectos separados).
- **Usuarios hoy:** menos de 10 personas, todas del equipo de GoHub.
- **Propuesta:** dar a "high-performers" una imagen completa del tiempo que dedican al ejercicio y convertir un buen hábito
  en una competición con los compañeros.
- **Qué hace volver a la gente:** a partes iguales, (1) la carrera/ranking de Grupos y (2) ver tus propios datos en la pestaña Tú.
- **Cómo entran los datos:** mayoritariamente a mano. Strava cubre una parte (cron diario a las 04:00 UTC). La fricción del
  registro manual no preocupa porque la apuesta a medio plazo es que **los agentes personales metan los datos** (ver §6).

## 2. Lo que existe (mapa técnico)

| Capa | Detalle |
|---|---|
| Frontend | React 18 + Vite 6 + Tailwind + framer-motion + recharts, PWA (`public/manifest.json`) |
| Rutas | `/` Landing pública (ES/EN, waitlist) · `/login` · `/reset` · `/feed` · `/actividad` ("Tú") · `/grupos` · `/mas` |
| Estado | `AuthContext`, `DataContext` (actividades + `team_members`), `MonthContext`, `theme` |
| Backend | Supabase (Postgres + Auth + Storage para avatares), RLS en todas las tablas |
| Serverless | Vercel `api/`: `strava-auth`, `strava-callback`, `strava-sync`, `strava-sync-all` (cron), `whoop-auth`, `whoop-callback`, `whoop-sync` |
| Migraciones | Scripts SQL en `db/` que se ejecutan **a mano en el SQL editor de producción**; no hay staging ni tests |

**Pestaña Tú (`src/pages/Actividad.jsx`, ~1.270 líneas):** últimos/próximos 7 días, carga (7 días frente a la media), horas
semanales, ritmo estacional, fuerza por grupo muscular, semana deslizable, calendario, carga muscular, gráficas reordenables,
objetivos y marcas.

**Grupos (`src/pages/Grupos.jsx`, ~930 líneas):** récords del equipo, carrera y podio (semana / mes / 3 meses móviles),
filas de miembros (semana actual y ritmo), ritmo estacional del grupo.

**Feed:** actividades del equipo y marcas personales batidas.

**Modelo de "equipo" actual:** implícito. Hay un único equipo: todo el que tiene fila en `team_members` aparece en Grupos.
Las políticas `SELECT` de `team_members`, `activities`, `goals` y `objectives` son `USING (true)`: **cualquier usuario
autenticado ve los datos de todos**. `team_members.group_id` y `role` existen, pero no se usan.

## 3. Decisiones tomadas en la entrevista

| Tema | Decisión |
|---|---|
| Siguiente grupo | Otra empresa o fondo, del estilo de GoHub |
| Plazo | Tenerlo dentro **este trimestre** (antes de fin de 2026) |
| Prioridad | **Grupos aislados primero**; el MCP, después (enero) |
| Modelo | Grupos aislados; un usuario puede estar en **varios** grupos |
| Entrada a un grupo | Enlace o código de invitación |
| Gestión | Solo Jorge crea grupos (superadmin); cada grupo tiene uno o varios admins que invitan, expulsan y regeneran el enlace |
| Feed | Mezcla la actividad de todos mis grupos (sin selector) |
| Ranking entre grupos | Sí, por **horas por miembro activo** (media de horas de quienes registraron algo en el periodo) |
| Ranking individual global | Sí, con **nombre y horas, opt-in** (por defecto no apareces) |
| Antitrampas | No se necesita: la confianza entre conocidos basta; la métrica sigue siendo horas |
| RGPD | Mínimo razonable: política de privacidad, consentimiento explícito al registrarse y borrado de cuenta y datos desde la app |
| Entornos | Segundo proyecto Supabase de **staging**; probar allí antes de producción |
| Whoop | Se conserva; se intentará activar más adelante (fuera de alcance ahora) |
| Suplementos/huevos | Borrar `supplements`, `supplement_intakes` y `egg_intakes` |

## 4. Fase 1: grupos aislados (este trimestre)

### 4.1 Modelo de datos

```sql
groups (
  id uuid pk, name text not null, slug text unique,
  invite_code text unique not null,      -- regenerable
  created_by uuid references auth.users, created_at timestamptz
)

group_members (
  group_id uuid references groups on delete cascade,
  user_id  uuid references auth.users on delete cascade,
  role text check (role in ('admin','member')) default 'member',
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
)
```

- `team_members` pasa a ser el **perfil** global (nombre, alias, avatar, conexiones). Se añaden:
  - `is_superadmin boolean default false`
  - `global_ranking_opt_in boolean default false`
  - `privacy_accepted_at timestamptz`
- Se elimina el uso de `team_members.group_id` y `role` (sustituidos por `group_members`).
- Migración de datos: crear el grupo "GoHub" y meter en él a todos los `team_members` actuales; Jorge queda como admin y superadmin.

### 4.2 Seguridad (RLS)

Función auxiliar `security definer`:

```sql
shares_group(other uuid) returns boolean
  -- true si auth.uid() y other comparten al menos un grupo, o si other = auth.uid()
```

| Tabla | SELECT | Escritura |
|---|---|---|
| `team_members` (perfil) | `shares_group(user_id)` o `global_ranking_opt_in` (este segundo caso solo con columnas públicas, mediante vista) | solo el propio usuario |
| `activities`, `goals`, `objectives`, `pr_achievements` | `shares_group(user_id)` | solo el propio usuario |
| `groups` | grupos de los que soy miembro | solo el superadmin |
| `group_members` | miembros de mis grupos | admin del grupo (expulsar, cambiar rol); el propio usuario (salir) |
| `weekly_plans`, tokens, `whoop_*` | sin cambios (solo el propio usuario) | sin cambios |

- **Unirse por código:** RPC `join_group(code text)` con `security definer`. Valida el código e inserta en `group_members`.
  El cliente nunca puede listar los grupos ni sus códigos.
- **Rankings agregados:** vistas o RPC `security definer` que devuelven solo agregados:
  - `group_leaderboard(period)` → nombre del grupo y horas por miembro activo
  - `global_individual_leaderboard(period)` → solo usuarios con opt-in
  - Así no se abre `activities` a desconocidos.
- **Lado servidor:** `strava-sync-all` y las demás funciones usan la service key; hay que revisar que ninguna devuelva datos de otros usuarios.

### 4.3 Producto y UX

- **Invitación:** enlace `olympia.../join/<code>`.
  - Sin sesión: login o registro y, después, unión automática al grupo.
  - Con sesión: confirmación ("Unirte a *Empresa X*") y entrada directa.
  - La invitación sustituye a la waitlist como vía de entrada; la landing y la waitlist se mantienen para quien llegue de fuera.
- **Grupos:**
  - Con un solo grupo, la pantalla queda como hoy.
  - Con varios, aparece un selector de grupo arriba que afecta a carrera, miembros, récords y ritmo.
  - Debajo, dos bloques nuevos: "Entre grupos" (horas por miembro activo) y "Ranking global" (solo opt-in).
- **Feed:** actividades y marcas de cualquier persona que comparta al menos un grupo conmigo, sin duplicados.
- **Más → ajustes:**
  - Mis grupos (salir de un grupo).
  - Interruptor "Aparecer en el ranking global".
  - Borrar mi cuenta y mis datos.
  - Enlace a la política de privacidad.
- **Panel de admin de grupo (en Más):** copiar o regenerar el enlace, lista de miembros, expulsar, hacer admin.
- **Superadmin:** crear grupos (puede ser un formulario mínimo en Más o, al principio, un script SQL en `db/`).
- **Registro:** casilla obligatoria de consentimiento para tratar datos de actividad física, con enlace a la política.
  Se guarda en `privacy_accepted_at`.
- **Borrado de cuenta:** función serverless con service key que borra el usuario de `auth.users`. El `on delete cascade`
  arrastra las actividades, las metas, los tokens y las pertenencias. Pide confirmación escribiendo el email.

### 4.4 Limpieza incluida en la fase 1

- Migración que hace `drop` de `supplements`, `supplement_intakes` y `egg_intakes` (comprobando antes que ningún código las referencia).
- Actualizar `supabase-schema.sql` para que refleje el estado real; hoy está desfasado respecto a `db/`.
- Montar staging:
  - Segundo proyecto Supabase.
  - Variables `VITE_SUPABASE_*` de preview en Vercel apuntando a staging.
  - Cada script de `db/` se aplica primero en staging.

### 4.5 Criterios de hecho

1. Un usuario de un grupo de prueba **no puede** leer, ni desde la consola del navegador con su JWT, actividades, metas ni
   perfiles de GoHub, salvo los agregados de ranking y los perfiles con opt-in.
2. Un usuario de GoHub sigue viendo exactamente lo mismo que hoy.
3. Un enlace de invitación lleva a alguien sin cuenta de cero a dentro del grupo en menos de 2 minutos.
4. El admin del grupo puede expulsar a alguien y regenerar el enlace; el enlace viejo deja de funcionar.
5. El borrado de cuenta elimina todos los datos del usuario (comprobado en staging).
6. La segunda empresa está dentro y registra actividad durante 2 semanas.

## 5. Riesgos y preguntas abiertas

- **Capacidad de la app de Strava:** las apps nuevas de Strava tienen un límite de atletas conectados hasta que Strava las
  revisa. Hay que comprobar la capacidad actual en strava.com/settings/api antes de invitar a otra empresa.
- **Rendimiento de RLS:** `shares_group()` se evalúa por fila; con pocos usuarios no importa, pero conviene indexar
  `group_members(user_id)`.
- **`DataContext` carga todas las actividades:** con varios grupos, la consulta pasa a estar limitada por RLS. Hay que
  revisar que los cálculos de Grupos usen el grupo seleccionado y no todo lo visible.
- **Récords del equipo y carrera:** hoy asumen un solo equipo (`src/utils/teamRecords.js`); hay que parametrizarlos por grupo.
- **Política de privacidad:** hay que redactarla (responsable: Jorge como persona física; encargados: Supabase, Vercel, Strava).
- **Páginas muy grandes** (`Actividad.jsx`, `Grupos.jsx`): no se refactorizan por refactorizar, pero los cambios de grupo
  en `Grupos.jsx` son buen momento para extraer componentes.

## 6. Fase 2: servidor MCP de Olympia (a partir de enero 2027)

Objetivo: que el usuario conecte Olympia a su agente (Claude, ChatGPT…) y diga "apunta 1 h de pádel ayer" sin abrir la app.

- Servidor MCP remoto (función de Vercel o Supabase Edge Function) con OAuth contra Supabase Auth, de modo que el agente
  actúa con el JWT del usuario y la RLS sigue aplicándose.
- Herramientas mínimas:
  - `log_activity(type, date, duration_minutes, distance_km?, muscle_groups?, notes?)`
  - `list_my_activities(from, to)`
  - `update_activity` / `delete_activity` (solo las propias)
  - `my_week_summary()` y `group_leaderboard(group, period)` (solo lectura)
- Añadir `source = 'agent'` al `CHECK` de `activities.source`.
- Fuera de alcance por ahora: un agente dentro de la app.

## 7. Fuera de alcance

- Whoop (se conserva el código; activación más adelante).
- Antitrampas y métricas alternativas a horas.
- Monetización.
- Cualquier relación con el CPG 2027.
- Creación de grupos en autoservicio.
