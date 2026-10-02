-- Objetivos y marcas (oct 2026). Ejecutar en el SQL editor de Supabase.

-- 1) MARCAS — cosas a batir. Se añade un objetivo opcional (p. ej. llegar a
--    100 kg) y el sentido de mejora (en tiempos de carrera, menos es mejor).
ALTER TABLE goals ADD COLUMN IF NOT EXISTS target_value NUMERIC;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS lower_is_better BOOLEAN NOT NULL DEFAULT false;

-- 2) OBJETIVOS — volumen en un periodo: horas o nº de sesiones de un tipo de
--    actividad (o de todas) por semana o por mes. El progreso lo calcula la app
--    a partir de las actividades registradas.
CREATE TABLE IF NOT EXISTS objectives (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email    TEXT NOT NULL,
  activity_type TEXT,                         -- NULL = cualquier actividad
  metric        TEXT NOT NULL CHECK (metric IN ('hours', 'sessions')),
  period        TEXT NOT NULL CHECK (period IN ('week', 'month')),
  target        NUMERIC NOT NULL CHECK (target > 0),
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;

-- Todo el equipo puede verlos (se muestran en Grupos); cada uno gestiona los suyos
DROP POLICY IF EXISTS "Todos ven objetivos" ON objectives;
CREATE POLICY "Todos ven objetivos" ON objectives FOR SELECT USING (true);
DROP POLICY IF EXISTS "Usuarios crean sus objetivos" ON objectives;
CREATE POLICY "Usuarios crean sus objetivos" ON objectives FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Usuarios editan sus objetivos" ON objectives;
CREATE POLICY "Usuarios editan sus objetivos" ON objectives FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Usuarios borran sus objetivos" ON objectives;
CREATE POLICY "Usuarios borran sus objetivos" ON objectives FOR DELETE USING (auth.uid() = user_id);
