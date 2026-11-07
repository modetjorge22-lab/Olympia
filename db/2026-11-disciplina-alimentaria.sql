-- Disciplina alimentaria: hasta 3 estándares por usuario y un sí/no por día.
-- Todo es privado (RLS: solo su dueño). El grupo solo ve la racha, a través de
-- diet_streaks(), que no expone estándares ni fallos.

create table if not exists diet_standards (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  user_email text not null,
  text text not null,
  position int not null default 0,
  archived boolean not null default false,
  created_at timestamptz default now()
);
alter table diet_standards enable row level security;
create policy "diet_standards propios" on diet_standards for all
  using (user_email = auth.email()) with check (user_email = auth.email());

create table if not exists diet_days (
  user_email text not null,
  user_id uuid references auth.users(id) on delete cascade,
  date date not null,
  met boolean not null,
  failed_ids uuid[] not null default '{}',
  updated_at timestamptz default now(),
  primary key (user_email, date)
);
alter table diet_days enable row level security;
create policy "diet_days propios" on diet_days for all
  using (user_email = auth.email()) with check (user_email = auth.email());

-- Racha actual (días cumplidos seguidos que acaban hoy o ayer) y mejor racha.
create or replace function diet_streaks()
returns table (user_email text, streak int, best int)
language sql stable security definer set search_path = public as $$
  with d as (select dd.user_email, dd.date from diet_days dd where dd.met),
  g as (select d.user_email, d.date, d.date - (row_number() over (partition by d.user_email order by d.date))::int as grp from d),
  isl as (select g.user_email, max(g.date) as e, count(*)::int as n from g group by g.user_email, g.grp)
  select isl.user_email,
         coalesce(max(isl.n) filter (where isl.e >= (now() at time zone 'Europe/Madrid')::date - 1), 0)::int,
         max(isl.n)::int
  from isl group by isl.user_email;
$$;
revoke all on function diet_streaks() from public;
grant execute on function diet_streaks() to authenticated;

-- Es opcional: cada uno la activa abajo del todo en Tú.
alter table team_members add column if not exists diet_enabled boolean not null default false;
