import crypto from 'node:crypto';
import { adminClient } from './_lib/auth.js';
import { importSleep, importWorkout, removeWorkout, whoopGet } from './_lib/whoop.js';

// WHOOP avisa aquí de entrenos, sueños y recuperaciones nuevos o borrados.
// El aviso solo trae ids: los datos se piden a la API. La firma es
// base64(HMAC-SHA256(timestamp + cuerpo crudo, client secret)).

async function rawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function validSignature(req, body) {
  const sig = req.headers['x-whoop-signature'];
  const ts = req.headers['x-whoop-signature-timestamp'];
  if (!sig || !ts || !process.env.WHOOP_CLIENT_SECRET) return false;
  // Rechaza avisos con más de 1 h (WHOOP reintenta durante ~1 h).
  if (Math.abs(Date.now() - Number(ts)) > 65 * 60 * 1000) return false;
  const expected = crypto.createHmac('sha256', process.env.WHOOP_CLIENT_SECRET).update(ts + body).digest('base64');
  const a = Buffer.from(String(sig));
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = await rawBody(req);
  if (!validSignature(req, body)) return res.status(401).json({ error: 'invalid_signature' });

  let event;
  try { event = JSON.parse(body); } catch { return res.status(400).json({ error: 'bad_json' }); }
  const { user_id: whoopUserId, id, type } = event;

  const sb = adminClient();
  const { data: row } = await sb.from('whoop_tokens').select('*').eq('whoop_user_id', whoopUserId).maybeSingle();
  // Usuario desconectado: 200 para que WHOOP no reintente.
  if (!row) return res.status(200).json({ ignored: 'unknown_user' });

  try {
    switch (type) {
      case 'workout.updated':
        await importWorkout(sb, row, await whoopGet(sb, row, `/v2/activity/workout/${id}`));
        break;
      case 'workout.deleted':
        await removeWorkout(sb, id);
        break;
      case 'sleep.updated':
      case 'recovery.updated': // en v2 el id de recovery es el del sueño
        await importSleep(sb, row, await whoopGet(sb, row, `/v2/activity/sleep/${id}`));
        break;
      case 'sleep.deleted':
        await sb.from('whoop_sleep').delete().eq('whoop_sleep_id', id);
        break;
      case 'recovery.deleted':
        await sb.from('whoop_sleep').update({ score: null, recovery_score: null, hrv_ms: null, resting_hr: null }).eq('whoop_sleep_id', id);
        break;
      default:
        break;
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[whoop-webhook]', type, id, err.message);
    if (err.code === 'reconnect_required') return res.status(200).json({ ignored: 'reconnect_required' });
    // 500 → WHOOP reintenta (5 veces en ~1 h).
    return res.status(500).json({ error: 'processing_failed' });
  }
}
