-- Lista de espera de la landing pública.
-- Ejecutar en el SQL editor de Supabase antes de publicar la landing.
create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table waitlist enable row level security;

-- Cualquier visitante (rol anon) puede apuntarse, pero nadie puede leer
-- ni modificar la lista desde el cliente.
drop policy if exists "anon puede apuntarse" on waitlist;
create policy "anon puede apuntarse"
  on waitlist for insert
  to anon, authenticated
  with check (true);
