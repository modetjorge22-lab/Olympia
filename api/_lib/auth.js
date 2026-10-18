import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

// Vercel no publica como función los archivos con prefijo "_".

export function adminClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function bearer(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

// Usuario de Supabase a partir del JWT que manda el cliente. null si no es válido.
export async function getAuthedUser(req) {
  const token = bearer(req);
  if (!token) return null;
  const { data, error } = await adminClient().auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

// Llamada interna del cron. Sin CRON_SECRET configurado, nunca es cron.
export function isCron(req) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && bearer(req) === secret;
}

// ── state de OAuth firmado ──
// Antes el state era el email en claro: cualquiera podía vincular su cuenta de
// Strava/Whoop a la de otra persona. Ahora va firmado y caduca a los 10 min.

const STATE_TTL_MS = 10 * 60 * 1000;

function stateSecret() {
  return process.env.OAUTH_STATE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function sign(body) {
  return crypto.createHmac('sha256', stateSecret()).update(body).digest('base64url');
}

export function signState(user) {
  const body = Buffer.from(JSON.stringify({
    uid: user.id,
    email: user.email,
    exp: Date.now() + STATE_TTL_MS,
  })).toString('base64url');
  return `${body}.${sign(body)}`;
}

// Devuelve { uid, email } o null si la firma no cuadra o ha caducado.
export function verifyState(state) {
  if (typeof state !== 'string') return null;
  const [body, sig] = state.split('.');
  if (!body || !sig) return null;
  const expected = sign(body);
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (!data.uid || !data.email || Date.now() > data.exp) return null;
    return { uid: data.uid, email: data.email };
  } catch {
    return null;
  }
}
