-- ══════════════════════════════════════════════════════════════════
-- FASE 0 · Grupos aislados y RLS por grupo (oct 2026)
-- Spec: .plans/olympia-lanzamiento-publico-spec.md §4
--
-- Ejecutar PRIMERO en staging, pasar scripts/test-rls.mjs y solo después
-- en producción. Idempotente: se puede volver a ejecutar sin romper nada.
--
-- Qué hace:
--   1. Crea groups y group_members.
--   2. Amplía team_members (perfil global) con columnas nuevas y protege
--      las que el usuario no debe poder tocar (is_superadmin, cohort, utm_*).
--   3. Crea el grupo "GoHub" con todos los miembros actuales.
--   4. Sustituye las políticas SELECT "USING (true)" por shares_group().
--   5. RPC para crear grupo, unirse por código, regenerar enlace, salir
--      y expulsar. El cliente nunca escribe directamente en groups ni
--      group_members.
-- ══════════════════════════════════════════════════════════════════


-- ── 1. TABLAS ─────────────────────────────────────────────────────

create table if not exists groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) between 1 and 60),
  invite_code text not null unique,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists group_members (
  group_id  uuid not null references groups(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  role      text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists group_members_user_idx on group_members(user_id);

alter table groups enable row level security;
alter table group_members enable row level security;


-- ── 2. PERFIL GLOBAL (team_members) ───────────────────────────────

alter table team_members add column if not exists is_superadmin       boolean not null default false;
alter table team_members add column if not exists privacy_accepted_at timestamptz;
alter table team_members add column if not exists onboarded_at        timestamptz;
alter table team_members add column if not exists preferred_types     text[];
alter table team_members add column if not exists cohort              text;
alter table team_members add column if not exists utm_source          text;
alter table team_members add column if not exists utm_campaign        text;

-- El usuario puede editar su perfil (UPDATE propio), pero estas columnas solo
-- las fija el servidor (service_role) o el SQL editor.
create or replace function protect_team_member_columns()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.is_superadmin := false;
      new.cohort := null;
      new.utm_source := null;
      new.utm_campaign := null;
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

drop trigger if exists protect_team_member_columns on team_members;
create trigger protect_team_member_columns
  before insert or update on team_members
  for each row execute function protect_team_member_columns();


-- ── 3. FUNCIONES AUXILIARES (security definer: evitan recursión de RLS) ──

-- true si other es el propio usuario o si comparten algún grupo.
create or replace function shares_group(other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select other = auth.uid()
      or exists (
        select 1
        from group_members mine
        join group_members theirs on theirs.group_id = mine.group_id
        where mine.user_id = auth.uid()
          and theirs.user_id = other
      );
$$;

create or replace function is_group_member(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from group_members where group_id = gid and user_id = auth.uid());
$$;

create or replace function is_group_admin(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from group_members
    where group_id = gid and user_id = auth.uid() and role = 'admin'
  );
$$;

-- 48 bits aleatorios (gen_random_uuid usa el generador criptográfico).
create or replace function new_invite_code()
returns text
language sql
volatile
as $$
  select substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
$$;

revoke all on function shares_group(uuid)    from public;
revoke all on function is_group_member(uuid) from public;
revoke all on function is_group_admin(uuid)  from public;
grant execute on function shares_group(uuid)    to authenticated;
grant execute on function is_group_member(uuid) to authenticated;
grant execute on function is_group_admin(uuid)  to authenticated;


-- ── 4. RELLENAR user_id QUE FALTEN ───────────────────────────────
-- La RLS nueva filtra por user_id. Las filas antiguas creadas por Strava o
-- Whoop sin user_id quedarían invisibles incluso para su dueño.
update team_members m    set user_id = u.id from auth.users u where m.user_id is null and lower(u.email) = lower(m.email);
update activities a      set user_id = u.id from auth.users u where a.user_id is null and lower(u.email) = lower(a.user_email);
update goals g           set user_id = u.id from auth.users u where g.user_id is null and lower(u.email) = lower(g.user_email);
update pr_achievements p set user_id = u.id from auth.users u where p.user_id is null and lower(u.email) = lower(p.user_email);
update objectives o      set user_id = u.id from auth.users u where o.user_id is null and lower(u.email) = lower(o.user_email);
update strava_tokens t   set user_id = u.id from auth.users u where t.user_id is null and lower(u.email) = lower(t.user_email);
update whoop_tokens t    set user_id = u.id from auth.users u where t.user_id is null and lower(u.email) = lower(t.user_email);


-- ── 5. MIGRACIÓN DE DATOS: grupo GoHub ────────────────────────────

do $$
declare
  gohub_id uuid;
  jorge_id uuid;
begin
  select id into jorge_id from auth.users where lower(email) = 'jorge.modet@gohub.vc' limit 1;

  select id into gohub_id from groups where name = 'GoHub' order by created_at limit 1;
  if gohub_id is null then
    insert into groups (name, invite_code, created_by)
    values ('GoHub', new_invite_code(), jorge_id)
    returning id into gohub_id;
  end if;

  -- Todos los que hoy aparecen en Grupos (tienen ficha en team_members).
  insert into group_members (group_id, user_id, role)
  select distinct gohub_id, tm.user_id, 'member'
  from team_members tm
  where tm.user_id is not null
  on conflict (group_id, user_id) do nothing;

  if jorge_id is not null then
    insert into group_members (group_id, user_id, role)
    values (gohub_id, jorge_id, 'admin')
    on conflict (group_id, user_id) do update set role = 'admin';

    update team_members set is_superadmin = true where user_id = jorge_id;
  end if;
end;
$$;


-- ── 6. POLÍTICAS ──────────────────────────────────────────────────

-- team_members (perfil)
drop policy if exists "Todos pueden ver miembros" on team_members;
drop policy if exists "Ven perfiles de sus grupos" on team_members;
create policy "Ven perfiles de sus grupos" on team_members
  for select to authenticated using (shares_group(user_id));

-- activities
drop policy if exists "Todos ven actividades" on activities;
drop policy if exists "Ven actividades de sus grupos" on activities;
create policy "Ven actividades de sus grupos" on activities
  for select to authenticated using (shares_group(user_id));

-- goals (marcas)
drop policy if exists "Todos pueden ver goals" on goals;
drop policy if exists "Usuarios ven sus goals" on goals;
drop policy if exists "Ven marcas de sus grupos" on goals;
create policy "Ven marcas de sus grupos" on goals
  for select to authenticated using (shares_group(user_id));

-- pr_achievements
drop policy if exists "Todos ven los PRs" on pr_achievements;
drop policy if exists "Ven PRs de sus grupos" on pr_achievements;
create policy "Ven PRs de sus grupos" on pr_achievements
  for select to authenticated using (shares_group(user_id));

-- objectives
drop policy if exists "Todos ven objetivos" on objectives;
drop policy if exists "Ven objetivos de sus grupos" on objectives;
create policy "Ven objetivos de sus grupos" on objectives
  for select to authenticated using (shares_group(user_id));

-- groups: solo los míos. Sin políticas de escritura (todo va por RPC).
drop policy if exists "Ven sus grupos" on groups;
create policy "Ven sus grupos" on groups
  for select to authenticated using (is_group_member(id));

-- group_members: miembros de mis grupos. Sin políticas de escritura.
drop policy if exists "Ven miembros de sus grupos" on group_members;
create policy "Ven miembros de sus grupos" on group_members
  for select to authenticated using (is_group_member(group_id));

-- El código de invitación solo lo ven los admins: se oculta la columna al
-- resto y se lee con my_group_invite().
revoke select on groups from anon, authenticated;
grant select (id, name, created_by, created_at) on groups to authenticated;
revoke insert, update, delete on groups from anon, authenticated;
revoke insert, update, delete on group_members from anon, authenticated;
grant select on group_members to authenticated;


-- ── 7. RPC ────────────────────────────────────────────────────────

create or replace function create_group(group_name text)
returns table (id uuid, name text, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  g groups;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if group_name is null or length(trim(group_name)) not between 1 and 60 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;
  -- Freno a abusos: máximo 5 grupos creados por usuario.
  if (select count(*) from groups where created_by = auth.uid()) >= 5 then
    raise exception 'too_many_groups' using errcode = '54000';
  end if;

  insert into groups (name, invite_code, created_by)
  values (trim(group_name), new_invite_code(), auth.uid())
  returning * into g;

  insert into group_members (group_id, user_id, role) values (g.id, auth.uid(), 'admin');

  return query select g.id, g.name, g.invite_code;
end;
$$;

create or replace function join_group(code text)
returns table (id uuid, name text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  g groups;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into g from groups where invite_code = lower(trim(code));
  if g.id is null then
    raise exception 'invalid_code' using errcode = 'P0002';
  end if;

  insert into group_members (group_id, user_id, role)
  values (g.id, auth.uid(), 'member')
  on conflict (group_id, user_id) do nothing;

  return query select g.id, g.name;
end;
$$;

-- Código actual de un grupo (solo admins).
create or replace function my_group_invite(gid uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_group_admin(gid) then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  return (select invite_code from groups where id = gid);
end;
$$;

create or replace function regenerate_invite(gid uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  code text;
begin
  if not is_group_admin(gid) then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  update groups set invite_code = new_invite_code() where id = gid returning invite_code into code;
  return code;
end;
$$;

create or replace function leave_group(gid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from group_members where group_id = gid and user_id = auth.uid();
  -- Si era el último admin, el miembro más antiguo pasa a admin.
  if not exists (select 1 from group_members where group_id = gid and role = 'admin') then
    update group_members set role = 'admin'
    where (group_id, user_id) = (
      select group_id, user_id from group_members
      where group_id = gid order by joined_at limit 1
    );
  end if;
  -- Grupo vacío: se borra.
  delete from groups g where g.id = gid and not exists (select 1 from group_members where group_id = gid);
end;
$$;

create or replace function remove_group_member(gid uuid, member uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_group_admin(gid) then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if member = auth.uid() then
    raise exception 'use_leave_group' using errcode = '22023';
  end if;
  delete from group_members where group_id = gid and user_id = member;
end;
$$;

revoke all on function create_group(text)              from public;
revoke all on function join_group(text)                from public;
revoke all on function my_group_invite(uuid)           from public;
revoke all on function regenerate_invite(uuid)         from public;
revoke all on function leave_group(uuid)               from public;
revoke all on function remove_group_member(uuid, uuid) from public;
grant execute on function create_group(text)              to authenticated;
grant execute on function join_group(text)                to authenticated;
grant execute on function my_group_invite(uuid)           to authenticated;
grant execute on function regenerate_invite(uuid)         to authenticated;
grant execute on function leave_group(uuid)               to authenticated;
grant execute on function remove_group_member(uuid, uuid) to authenticated;


-- ── 8. COMPROBACIÓN RÁPIDA ────────────────────────────────────────
-- Debe listar a todo el equipo en GoHub, con Jorge como admin:
--   select g.name, tm.full_name, gm.role
--   from group_members gm
--   join groups g on g.id = gm.group_id
--   left join team_members tm on tm.user_id = gm.user_id
--   order by gm.role, tm.full_name;
--
-- No debe quedar ninguna política SELECT con USING (true) en tablas de datos:
--   select tablename, policyname, qual from pg_policies
--   where schemaname = 'public' and cmd = 'SELECT' and qual = 'true';
--   (solo puede salir la de lectura propia si la hubiera; waitlist no tiene SELECT)
