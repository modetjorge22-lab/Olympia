-- ══════════════════════════════════════════════════════════════════
-- FASE 0 · Registro cerrado por waitlist (oct 2026)
-- Spec: .plans/olympia-lanzamiento-publico-spec.md §4.4
--
-- Ejecutar DESPUÉS de db/2026-10-fase0-grupos-rls.sql. Primero en staging.
-- Idempotente.
--
-- Solo puede crear cuenta quien tenga su email en waitlist con estado
-- 'invited' (o 'joined'). Aplica a email+contraseña, Google e invitaciones.
-- Las cuentas que ya existen no se ven afectadas.
--
-- Dos capas:
--   A. Hook "Before User Created" de Supabase Auth → mensaje claro al usuario.
--      Hay que activarlo a mano (ver final del archivo).
--   B. Trigger en auth.users → red de seguridad si el hook no está activo.
-- ══════════════════════════════════════════════════════════════════


-- ── 1. WAITLIST: estado, tanda y origen ───────────────────────────

alter table waitlist add column if not exists status       text not null default 'pending';
alter table waitlist add column if not exists invited_at   timestamptz;
alter table waitlist add column if not exists joined_at    timestamptz;
alter table waitlist add column if not exists cohort       text;
alter table waitlist add column if not exists utm_source   text;
alter table waitlist add column if not exists utm_campaign text;
alter table waitlist add column if not exists utm_content  text;
alter table waitlist add column if not exists referrer     text;
alter table waitlist add column if not exists survey       jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'waitlist_status_check') then
    alter table waitlist add constraint waitlist_status_check
      check (status in ('pending', 'invited', 'joined'));
  end if;
end;
$$;

-- Los emails siempre en minúsculas (la landing ya los manda así).
update waitlist set email = lower(trim(email)) where email <> lower(trim(email));

-- Quien ya tiene cuenta queda como 'joined'.
update waitlist w set status = 'joined', joined_at = coalesce(w.joined_at, u.created_at)
from auth.users u
where lower(u.email) = w.email and w.status <> 'joined';

-- Desde la landing solo se puede entrar como 'pending'. Antes la política era
-- WITH CHECK (true): un visitante podía insertarse ya invitado.
drop policy if exists "anon puede apuntarse" on waitlist;
create policy "anon puede apuntarse"
  on waitlist for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and invited_at is null
    and joined_at is null
    and cohort is null
  );


-- ── 2. ¿Puede registrarse este email? ─────────────────────────────

create or replace function email_can_sign_up(check_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from waitlist
    where email = lower(trim(check_email))
      and status in ('invited', 'joined')
  );
$$;

revoke all on function email_can_sign_up(text) from public, anon, authenticated;


-- ── 3A. HOOK "Before User Created" ────────────────────────────────

create or replace function hook_before_user_created(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if email_can_sign_up(event->'user'->>'email') then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message', 'Olympia está en acceso por invitación. Solicita acceso desde la página principal.'
    )
  );
end;
$$;

revoke all on function hook_before_user_created(jsonb) from public, anon, authenticated;
grant execute on function hook_before_user_created(jsonb) to supabase_auth_admin;


-- ── 3B. TRIGGER en auth.users (red de seguridad) ──────────────────

create or replace function enforce_waitlist_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not email_can_sign_up(new.email) then
    raise exception 'signup_not_invited' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_waitlist_on_signup on auth.users;
create trigger enforce_waitlist_on_signup
  before insert on auth.users
  for each row execute function enforce_waitlist_on_signup();

-- Al crearse la cuenta, la fila de waitlist pasa a 'joined'.
create or replace function mark_waitlist_joined()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update waitlist
  set status = 'joined', joined_at = now()
  where email = lower(new.email) and status <> 'joined';
  return new;
end;
$$;

drop trigger if exists mark_waitlist_joined on auth.users;
create trigger mark_waitlist_joined
  after insert on auth.users
  for each row execute function mark_waitlist_joined();


-- ── 4. Tanda y origen al crear el perfil ──────────────────────────
-- Sustituye al trigger de la migración de grupos: además de proteger las
-- columnas, copia cohort y utm_* desde la waitlist cuando el usuario crea
-- su ficha en team_members.

create or replace function protect_team_member_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  w waitlist;
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      select * into w from waitlist where email = lower(new.email);
      new.is_superadmin := false;
      new.cohort := w.cohort;
      new.utm_source := w.utm_source;
      new.utm_campaign := w.utm_campaign;
    else
      new.is_superadmin := old.is_superadmin;
      new.cohort := old.cohort;
      new.utm_source := old.utm_source;
      new.utm_campaign := old.utm_campaign;
    end if;
  end if;
  return new;
end;
$$;


-- ── 5. ACTIVAR EL HOOK (a mano, una vez por proyecto) ─────────────
-- Supabase → Authentication → Hooks → "Before User Created"
--   → Postgres function → public.hook_before_user_created → Enable.
--
-- Sin el hook, el trigger 3B sigue bloqueando el registro, pero el usuario
-- ve un error genérico ("Database error saving new user").


-- ── 6. INVITAR A MANO (hasta que exista el panel de superadmin) ───
-- Un email de la waitlist:
--   update waitlist set status = 'invited', invited_at = now(), cohort = 'T1'
--   where email = 'alguien@ejemplo.com';
--
-- Alguien que no está en la waitlist (p.ej. un nuevo compañero de GoHub):
--   insert into waitlist (email, status, invited_at, cohort)
--   values ('nuevo@gohub.vc', 'invited', now(), 'gohub')
--   on conflict (email) do update set status = 'invited', invited_at = now();
--
-- Después: que se registre en /login, y si es de GoHub, que entre al grupo
-- con el código (select invite_code from groups where name = 'GoHub').
