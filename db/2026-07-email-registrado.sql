-- Detección de cuentas existentes desde la landing.
-- Permite al formulario "Solicitar acceso" saber si un email ya tiene cuenta
-- y mandar al usuario directamente al login.
-- Ejecutar en el SQL editor de Supabase.
--
-- Nota de privacidad: expone únicamente un booleano existe/no existe,
-- nunca datos del usuario.
create or replace function email_is_registered(check_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1 from auth.users where lower(email) = lower(check_email)
  );
$$;

grant execute on function email_is_registered(text) to anon, authenticated;
