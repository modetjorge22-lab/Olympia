-- ============================================
-- GoHub's Gym Tracker - Database Schema
-- Ejecutar en Supabase → SQL Editor → New query
-- ============================================

-- 1. TEAM MEMBERS (miembros del equipo)
CREATE TABLE team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  nickname TEXT,
  profile_image TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  group_id TEXT,
  strava_connected BOOLEAN DEFAULT false,
  whoop_connected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. WORKOUTS (plantillas de entrenamientos)
CREATE TABLE workouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('strength', 'cardio', 'flexibility', 'sport', 'other')),
  exercises JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. ACTIVITIES (actividades registradas)
CREATE TABLE activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  duration_minutes INTEGER,
  calories_burned INTEGER,
  distance_km NUMERIC(8,2),
  workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,
  exercises JSONB DEFAULT '[]',
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'strava', 'whoop')),
  strava_id TEXT,
  completed BOOLEAN DEFAULT false,
  match_result JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. GOALS (objetivos)
CREATE TABLE goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  title TEXT NOT NULL,
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  unit TEXT,
  deadline DATE,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. WEEKLY PLANS (planes semanales)
CREATE TABLE weekly_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  week_start DATE NOT NULL,
  plan JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. SUPPLEMENTS (suplementos)
CREATE TABLE supplements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. SUPPLEMENT INTAKES (registro de toma de suplementos)
CREATE TABLE supplement_intakes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  supplement_id UUID REFERENCES supplements(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  taken BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. EGG INTAKES (registro de ingesta de huevos)
CREATE TABLE egg_intakes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  date DATE NOT NULL,
  quantity INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. STRAVA TOKENS (tokens de Strava)
CREATE TABLE strava_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  athlete_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. WHOOP TOKENS (tokens de Whoop)
CREATE TABLE whoop_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. WHOOP SLEEP (datos de sueño de Whoop)
CREATE TABLE whoop_sleep (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  date DATE NOT NULL,
  score INTEGER,
  duration_minutes INTEGER,
  efficiency NUMERIC(5,2),
  rem_minutes INTEGER,
  deep_minutes INTEGER,
  light_minutes INTEGER,
  awake_minutes INTEGER,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Row Level Security (RLS) - MUY IMPORTANTE
-- Esto asegura que cada usuario solo ve sus datos
-- ============================================

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplements ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplement_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE egg_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE strava_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE whoop_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE whoop_sleep ENABLE ROW LEVEL SECURITY;

-- Políticas: los usuarios pueden ver todos los datos del equipo
-- pero solo modificar los suyos propios

-- Team Members: todos ven a todos, pero solo editas tu perfil
CREATE POLICY "Todos pueden ver miembros" ON team_members FOR SELECT USING (true);
CREATE POLICY "Usuarios editan su perfil" ON team_members FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuarios crean su perfil" ON team_members FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Activities: todos ven las actividades (feed), solo creas/editas las tuyas
CREATE POLICY "Todos ven actividades" ON activities FOR SELECT USING (true);
CREATE POLICY "Usuarios crean sus actividades" ON activities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuarios editan sus actividades" ON activities FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuarios borran sus actividades" ON activities FOR DELETE USING (auth.uid() = user_id);

-- Workouts: cada usuario ve y gestiona los suyos
CREATE POLICY "Usuarios ven sus workouts" ON workouts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuarios crean sus workouts" ON workouts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuarios editan sus workouts" ON workouts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuarios borran sus workouts" ON workouts FOR DELETE USING (auth.uid() = user_id);

-- Goals: cada usuario ve y gestiona los suyos
CREATE POLICY "Usuarios ven sus goals" ON goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuarios crean sus goals" ON goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuarios editan sus goals" ON goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuarios borran sus goals" ON goals FOR DELETE USING (auth.uid() = user_id);

-- Weekly Plans: cada usuario ve y gestiona los suyos
CREATE POLICY "Usuarios ven sus planes" ON weekly_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuarios crean sus planes" ON weekly_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuarios borran sus planes" ON weekly_plans FOR DELETE USING (auth.uid() = user_id);

-- Supplements: cada usuario ve y gestiona los suyos
CREATE POLICY "Usuarios ven sus suplementos" ON supplements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuarios crean sus suplementos" ON supplements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuarios borran sus suplementos" ON supplements FOR DELETE USING (auth.uid() = user_id);

-- Supplement Intakes
CREATE POLICY "Usuarios ven sus intakes" ON supplement_intakes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuarios crean sus intakes" ON supplement_intakes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuarios borran sus intakes" ON supplement_intakes FOR DELETE USING (auth.uid() = user_id);

-- Egg Intakes
CREATE POLICY "Usuarios ven sus huevos" ON egg_intakes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuarios crean sus huevos" ON egg_intakes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuarios borran sus huevos" ON egg_intakes FOR DELETE USING (auth.uid() = user_id);

-- Tokens: solo el propietario puede ver/gestionar sus tokens
CREATE POLICY "Usuarios ven sus strava tokens" ON strava_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuarios crean sus strava tokens" ON strava_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuarios editan sus strava tokens" ON strava_tokens FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Usuarios ven sus whoop tokens" ON whoop_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuarios crean sus whoop tokens" ON whoop_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuarios editan sus whoop tokens" ON whoop_tokens FOR UPDATE USING (auth.uid() = user_id);

-- Whoop Sleep: solo el propietario
CREATE POLICY "Usuarios ven su sleep" ON whoop_sleep FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuarios crean su sleep" ON whoop_sleep FOR INSERT WITH CHECK (auth.uid() = user_id);
