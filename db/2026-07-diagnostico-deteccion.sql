-- ══════════════════════════════════════════════════════════════════
-- DIAGNÓSTICO: por qué email_is_registered devuelve false
-- Ejecuta los pasos EN ORDEN en el SQL editor de Supabase.
-- ══════════════════════════════════════════════════════════════════

-- ── PASO 1 ── ¿Qué emails hay realmente registrados?
-- Aquí ves con qué email existe tu cuenta (puede diferir del que probaste,
-- p. ej. si entraste con Google usando otra dirección).
select id, email, created_at, last_sign_in_at
from auth.users
order by created_at;


-- ── PASO 2 ── Test cruzado: la función contra los emails reales.
-- Interpretación:
--   · Si "detecta" sale TRUE en todas las filas  → la función funciona bien y
--     el false de antes fue porque el email probado no era el de la cuenta.
--   · Si "detecta" sale FALSE con emails que SÍ existen → la función no puede
--     leer auth.users: aplica el PASO 3.
select u.email, email_is_registered(u.email) as detecta
from auth.users u
order by u.created_at;


-- ── PASO 3 ── Reparación (solo si el paso 2 dio FALSE con emails existentes).
-- Recrea la función asegurando que el propietario y el search_path permiten
-- leer el esquema auth.
drop function if exists email_is_registered(text);

create function email_is_registered(check_email text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  found boolean;
begin
  select exists(
    select 1 from auth.users u
    where lower(u.email) = lower(trim(check_email))
  ) into found;
  return found;
end;
$$;

alter function email_is_registered(text) owner to postgres;
grant execute on function email_is_registered(text) to anon, authenticated;

-- Verificación final: repite el PASO 2. Debe salir TRUE en todas las filas.
