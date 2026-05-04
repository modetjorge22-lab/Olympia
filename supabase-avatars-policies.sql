-- ============================================
-- Olympia · Avatares en Supabase Storage
-- Copia y pega esto en Supabase → SQL Editor → Run
-- ============================================
-- Crea el bucket (si no existe), lo hace público para lectura,
-- y añade RLS policies para que cada usuario sólo pueda subir/editar/borrar
-- archivos dentro de su propia carpeta (que es su user_id).
--
-- El path que la app usa es: `${user.id}/avatar-{timestamp}.{ext}`
-- por ejemplo: f47ac10b-58cc-4372-a567-0e02b2c3d479/avatar-1714759923000.jpg
-- La policy comprueba que `auth.uid()::text` coincida con el primer segmento
-- del path (`(storage.foldername(name))[1]`).
-- ============================================

-- 1. Bucket "avatars" — público para lectura (las URLs públicas funcionan)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Limpieza de policies anteriores (si las regenero por error)
DROP POLICY IF EXISTS "Avatares públicos para lectura" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios suben su propio avatar"   ON storage.objects;
DROP POLICY IF EXISTS "Usuarios actualizan su propio avatar" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios borran su propio avatar"  ON storage.objects;

-- 3. SELECT — cualquier persona puede ver los avatares
CREATE POLICY "Avatares públicos para lectura"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- 4. INSERT — sólo subes a TU carpeta (auth.uid() = primer segmento del path)
CREATE POLICY "Usuarios suben su propio avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 5. UPDATE — sólo actualizas archivos de TU carpeta (necesario para upsert: true)
CREATE POLICY "Usuarios actualizan su propio avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 6. DELETE — sólo borras archivos de TU carpeta
CREATE POLICY "Usuarios borran su propio avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================
-- Listo. Ahora cualquier usuario logueado puede subir su avatar
-- (sólo en su propia carpeta) y todos pueden verlo.
-- ============================================
