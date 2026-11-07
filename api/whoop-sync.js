import { adminClient, getAuthedUser } from './_lib/auth.js';
import { fullSync, revokeAccess } from './_lib/whoop.js';

// POST con JWT.
//   { action: 'sync' }        → trae los últimos días (por defecto 7)
//   { action: 'disconnect' }  → revoca el acceso en WHOOP y borra los tokens
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await getAuthedUser(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });

  const sb = adminClient();
  const { data: row } = await sb.from('whoop_tokens').select('*').eq('user_email', user.email).maybeSingle();
  const action = req.body?.action || 'sync';

  if (action === 'disconnect') {
    if (row) {
      await revokeAccess(sb, row);
      await sb.from('whoop_tokens').delete().eq('id', row.id);
    }
    await sb.from('team_members').update({ whoop_connected: false }).eq('email', user.email);
    return res.status(200).json({ success: true });
  }

  if (!row) return res.status(404).json({ error: 'reconnect_required', message: 'WHOOP no está conectado.' });

  try {
    const days = Math.min(Math.max(Number(req.body?.days) || 7, 1), 90);
    const counts = await fullSync(sb, row, days);
    return res.status(200).json({ success: true, ...counts });
  } catch (err) {
    if (err.code === 'reconnect_required') {
      await sb.from('whoop_tokens').delete().eq('id', row.id);
      await sb.from('team_members').update({ whoop_connected: false }).eq('email', user.email);
      return res.status(401).json({ error: 'reconnect_required', message: 'Vuelve a conectar WHOOP.' });
    }
    console.error('[whoop-sync]', user.email, err.message);
    return res.status(500).json({ error: 'sync_error', message: 'No se pudo sincronizar WHOOP.' });
  }
}
