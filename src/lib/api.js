import { supabase } from './supabase';

// POST a una función de /api con el JWT de la sesión. Las funciones identifican
// al usuario por el token, nunca por un email que mande el cliente.
export async function apiPost(path, body) {
  const { data: { session } } = await supabase.auth.getSession();
  return fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// Pide a /api/<proveedor>-auth la URL de OAuth (con state firmado) y navega a ella.
export async function startOAuth(path) {
  const response = await apiPost(path);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.url) throw new Error(data.error || 'No se pudo iniciar la conexión');
  window.location.href = data.url;
}
