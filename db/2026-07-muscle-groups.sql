-- Grupos musculares explícitos por actividad.
-- Cuando el reconocimiento por palabras clave no detecta nada, la app
-- pregunta al usuario y guarda su respuesta aquí (array de claves,
-- ej: ["espalda","biceps"]). El radar de Fuerza prioriza este dato.
-- Ejecutar en el SQL editor de Supabase.
alter table activities add column if not exists muscle_groups jsonb;
