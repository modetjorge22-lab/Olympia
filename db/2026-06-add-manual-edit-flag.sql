-- Marca de edición manual en actividades.
-- Cuando el usuario corrige una actividad (p. ej. la duración que Strava
-- sobreestima), se marca manually_edited = true. A partir de entonces la
-- sincronización de Strava NO vuelve a sobrescribir sus datos: la edición
-- manual tiene prioridad.
--
-- Ejecutar en Supabase → SQL Editor → New query.

ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS manually_edited BOOLEAN DEFAULT false;
