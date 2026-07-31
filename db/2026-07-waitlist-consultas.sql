-- ══════════════════════════════════════════════════════════════════
-- 1) VER LAS SOLICITUDES DE ACCESO
--    Pégalo en el SQL editor de Supabase cuando quieras revisar la lista.
--    (También puedes verla sin SQL en: Table Editor → waitlist)
-- ══════════════════════════════════════════════════════════════════
select
  email,
  created_at at time zone 'Europe/Madrid' as solicitado,
  -- true = ese email ya tiene cuenta creada en Olympia
  exists(select 1 from auth.users u where lower(u.email) = w.email) as ya_tiene_cuenta
from waitlist w
order by created_at desc;


-- ══════════════════════════════════════════════════════════════════
-- 2) COMPROBAR QUE LA DETECCIÓN DE CUENTAS FUNCIONA
--    Debe devolver: true para un email con cuenta, false para uno inventado.
--    Si da error "function ... does not exist", falta ejecutar
--    db/2026-07-email-registrado.sql
-- ══════════════════════════════════════════════════════════════════
select
  email_is_registered('jorge.modet@gohub.vc') as deberia_ser_true,
  email_is_registered('nadie-inexistente@ejemplo.com') as deberia_ser_false;


-- ══════════════════════════════════════════════════════════════════
-- 3) SOLICITUDES DE LAS ÚLTIMAS 24 HORAS (para revisar a diario)
-- ══════════════════════════════════════════════════════════════════
select email, created_at at time zone 'Europe/Madrid' as solicitado
from waitlist
where created_at > now() - interval '24 hours'
order by created_at desc;
