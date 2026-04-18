import { createClient } from '@supabase/supabase-js';

// Endpoint invocado por Vercel Cron diariamente.
// Recorre todos los usuarios con Strava conectado y sincroniza sus actividades recientes.
// Requiere auth header de Vercel Cron (automático).

export default async function handler(req, res) {
  // Vercel añade este header automáticamente en invocaciones de cron
  const authHeader = req.headers.authorization;
  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: tokens, error } = await supabase
      .from('strava_tokens')
      .select('user_email');

    if (error) throw error;

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const results = [];
    for (const tok of tokens || []) {
      try {
        const resp = await fetch(`${baseUrl}/api/strava-sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: tok.user_email }),
        });
        const body = await resp.json();
        results.push({ email: tok.user_email, ok: resp.ok, ...body });
      } catch (err) {
        results.push({ email: tok.user_email, ok: false, error: err.message });
      }
    }

    return res.status(200).json({
      synced: results.filter(r => r.ok).length,
      failed: results.filter(r => !r.ok).length,
      results,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
