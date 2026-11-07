-- Entrenos de WHOOP que el usuario borró a propósito: la sincronización no los
-- vuelve a crear. Cada usuario solo ve y crea los suyos.
create table if not exists whoop_dismissed (
  whoop_id text primary key,
  user_email text not null,
  created_at timestamptz default now()
);
alter table whoop_dismissed enable row level security;
create policy "Usuarios ven sus descartes" on whoop_dismissed for select using (user_email = auth.email());
create policy "Usuarios crean sus descartes" on whoop_dismissed for insert with check (user_email = auth.email());
