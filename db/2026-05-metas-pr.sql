-- ============================================================
-- Olympia · Metas & Marcas Personales
-- Ejecutar en Supabase → SQL Editor → New query
-- ============================================================

-- 1. Añadir columnas a goals (si no existen)
ALTER TABLE goals ADD COLUMN IF NOT EXISTS activity_type TEXT;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS pb_date DATE;

-- 2. Cambiar la política SELECT de goals para que el equipo vea todas las metas
DROP POLICY IF EXISTS "Usuarios ven sus goals" ON goals;
CREATE POLICY "Todos pueden ver goals" ON goals FOR SELECT USING (true);

-- 3. Nueva tabla: historial de marcas personales (PRs)
CREATE TABLE IF NOT EXISTS pr_achievements (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email    TEXT NOT NULL,
  goal_id       UUID REFERENCES goals(id) ON DELETE CASCADE,
  goal_title    TEXT NOT NULL,
  new_value     NUMERIC NOT NULL,
  old_value     NUMERIC,
  unit          TEXT NOT NULL DEFAULT '',
  activity_type TEXT,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 4. RLS para pr_achievements
ALTER TABLE pr_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos ven los PRs"       ON pr_achievements FOR SELECT USING (true);
CREATE POLICY "Usuarios crean sus PRs"  ON pr_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuarios borran sus PRs" ON pr_achievements FOR DELETE USING (auth.uid() = user_id);
