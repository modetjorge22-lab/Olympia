-- WHOOP v2: entrenos como actividades, sueño + recuperación privados y tokens
-- fuera del alcance del navegador. Idempotente: se puede ejecutar más de una vez.

-- 1. Tokens: solo el servidor (service role) los lee o escribe.
alter table whoop_tokens add column if not exists whoop_user_id bigint;
alter table whoop_tokens add column if not exists scope text;
alter table whoop_tokens add column if not exists consent_at timestamptz;
create unique index if not exists whoop_tokens_whoop_user_id_key on whoop_tokens (whoop_user_id);

drop policy if exists "Usuarios ven sus whoop tokens" on whoop_tokens;
drop policy if exists "Usuarios crean sus whoop tokens" on whoop_tokens;
drop policy if exists "Usuarios editan sus whoop tokens" on whoop_tokens;
drop policy if exists "Usuarios borran sus whoop tokens" on whoop_tokens;

-- 2. Sueño y recuperación: una fila por sueño principal (sin siestas). Privado.
alter table whoop_sleep add column if not exists whoop_sleep_id text;
alter table whoop_sleep add column if not exists cycle_id bigint;
alter table whoop_sleep add column if not exists sleep_performance integer;
alter table whoop_sleep add column if not exists respiratory_rate numeric(5,2);
alter table whoop_sleep add column if not exists recovery_score integer;
alter table whoop_sleep add column if not exists hrv_ms numeric(6,2);
alter table whoop_sleep add column if not exists resting_hr integer;
alter table whoop_sleep add column if not exists updated_at timestamptz default now();
create unique index if not exists whoop_sleep_whoop_sleep_id_key on whoop_sleep (whoop_sleep_id);

-- 3. Actividades: enlace al entreno de WHOOP y sus métricas (strain, pulso…).
alter table activities add column if not exists whoop_id text;
alter table activities add column if not exists whoop_data jsonb;
create unique index if not exists activities_whoop_id_key on activities (whoop_id) where whoop_id is not null;
