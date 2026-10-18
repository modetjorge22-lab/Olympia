# Base de datos: staging y migraciones

Las migraciones de `db/` se ejecutan a mano en el SQL editor de Supabase.
Desde la fase 0 (oct 2026), **toda migración pasa primero por staging** y por
`scripts/test-rls.mjs` antes de tocar producción.

## 1. Montar staging (una vez)

1. **Crear el proyecto:** Supabase → New project → `olympia-staging`, en la misma región que producción.
2. **Copiar el esquema real de producción.** `supabase-schema.sql` está desfasado y no sirve de base.
   Con la [CLI de Supabase](https://supabase.com/docs/guides/cli):

   ```bash
   npx supabase db dump --db-url "postgresql://postgres:<PASS>@db.<PROD_REF>.supabase.co:5432/postgres" -f supabase-schema.sql
   ```

   Esto vuelca solo el esquema, sin datos. Después:
   - Se ejecuta `supabase-schema.sql` en el SQL editor de staging.
   - Se hace commit del archivo, que así refleja por fin el estado real.
3. **Storage:** crear el bucket `avatars` (público) y ejecutar `supabase-avatars-policies.sql`.
4. **Auth:** en Authentication → URL Configuration:
   - Site URL: la URL de preview de Vercel.
   - Redirect URLs: `https://*-<equipo>.vercel.app/**` y `http://localhost:5173/**`.
5. **Datos de prueba:**
   - Crear 2–3 usuarios a mano (Authentication → Add user) con su ficha en `team_members` y alguna actividad.
   - Uno de ellos con el email `jorge.modet@gohub.vc`, para que la migración de grupos lo haga admin.
6. **Vercel → Settings → Environment Variables**, entorno **Preview**:
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` → staging
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` → staging
   - `SITE_URL` → URL de preview
   - En **Production** se quedan las de producción.
7. **Local:** `.env.local` con las variables de staging. Producción no se toca desde local.

## 2. Aplicar la fase 0

Orden, primero en staging:

| # | Archivo | Qué hace |
|---|---|---|
| 1 | `2026-10-fase0-grupos-rls.sql` | Grupos, grupo GoHub, `shares_group()`, RLS por grupo, RPC |
| 2 | `2026-10-fase0-registro-cerrado.sql` | Waitlist con estado; solo se registran los invitados |
| 3 | Activar el hook | Authentication → Hooks → **Before User Created** → `public.hook_before_user_created` |
| 4 | `node scripts/test-rls.mjs --staging` | Debe acabar en "✔ Todo correcto" |

Variables de entorno nuevas en Vercel (**Production y Preview**):

| Variable | Para qué |
|---|---|
| `CRON_SECRET` | Obligatoria. Sin ella, `/api/strava-sync-all` queda cerrado y el cron diario de Strava deja de funcionar. Vercel la manda sola en cada invocación del cron |
| `OAUTH_STATE_SECRET` | Recomendada: firma el `state` de OAuth de Strava y Whoop. Si falta, se usa la service key |

Cuando staging pase el test, se repite en producción en el mismo orden.
Después se comprueba a mano que una cuenta de GoHub sigue viendo a todo el equipo en Grupos y en el Feed.

## 3. Después de la fase 0

- **Nuevo compañero de GoHub:**
  - Se invita en la waitlist (ver el final de `2026-10-fase0-registro-cerrado.sql`).
  - Se registra.
  - Entra en el grupo con el código: `select invite_code from groups where name = 'GoHub'`.
  - Hasta que exista la UI de grupos (fase 2), la unión se hace por SQL:
    ```sql
    insert into group_members (group_id, user_id)
    select g.id, u.id from groups g, auth.users u
    where g.name = 'GoHub' and u.email = 'nuevo@gohub.vc';
    ```
- **Antes vs. ahora:** quien solo tenía cuenta y no ficha en `team_members` (p.ej. un miembro retirado) ya no aparece en el Feed. Antes sí aparecía.
- **Test de RLS:** se vuelve a pasar tras cualquier migración que toque políticas, funciones `security definer` o tablas nuevas con datos de usuario.
