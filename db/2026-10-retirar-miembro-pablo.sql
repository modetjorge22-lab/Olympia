-- Retirar a Pablo de Grupos. Ejecutar en el SQL editor de Supabase, PASO A PASO.

-- ── PASO 1 ── Localizar su ficha (comprueba que sale solo él y anota su email)
select email, full_name, created_at
from team_members
where full_name ilike '%pablo%' or email ilike '%pablo%';


-- ── PASO 2 ── Quitarlo de Grupos.
-- Sustituye el email por el que viste en el paso 1 y quita los "--" para ejecutar.
-- Esto solo borra su ficha de miembro: deja de aparecer en Carrera, Miembros y
-- Récords. Su cuenta y sus actividades se conservan (por si vuelve).
-- delete from team_members where email = 'EMAIL_DE_PABLO';


-- ── OPCIONAL ── Si además quieres que desaparezcan sus actividades del Feed:
-- delete from activities where user_email = 'EMAIL_DE_PABLO';
--
-- Y si quieres eliminar su cuenta por completo (no podrá volver a entrar):
-- Supabase → Authentication → Users → su fila → Delete user.
