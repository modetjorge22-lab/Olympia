-- Añade duración planificada a weekly_plans (idempotente: no falla si ya existe)
ALTER TABLE weekly_plans ADD COLUMN IF NOT EXISTS duration_minutes integer;
