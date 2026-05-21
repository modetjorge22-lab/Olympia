import { createClient } from '@supabase/supabase-js';

async function refreshWhoopToken(supabase, tokenRecord) {
  const res = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokenRecord.refresh_token,
      client_id: process.env.WHOOP_CLIENT_ID,
      client_secret: process.env.WHOOP_CLIENT_SECRET,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to refresh Whoop token: ${body}`);
  }
  const data = await res.json();
  const expires_at = Math.floor(Date.now() / 1000) + (data.expires_in || 3600);
  await supabase
    .from('whoop_tokens')
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token || tokenRecord.refresh_token,
      expires_at,
    })
    .eq('id', tokenRecord.id);
  return data.access_token;
}

async function whoopGet(url, accessToken) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Whoop API error: ${res.status} ${url} | body: ${body}`);
  }
  return res.json();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: tokens } = await supabase
      .from('whoop_tokens').select('*').eq('user_email', email).limit(1);
    if (!tokens?.length) return res.status(404).json({ error: 'Whoop not connected' });

    const tokenRecord = tokens[0];
    const now = Math.floor(Date.now() / 1000);
    let accessToken;
    if (tokenRecord.expires_at < now) {
      if (!tokenRecord.refresh_token) {
        return res.status(401).json({ error: 'reconnect_required', message: 'Token expirado. Por favor reconecta Whoop.' });
      }
      accessToken = await refreshWhoopToken(supabase, tokenRecord);
    } else {
      accessToken = tokenRecord.access_token;
    }

    const user_id = tokenRecord.user_id || null;

    // Verificar token con perfil
    console.log('[whoop-sync] testing token with profile...');
    const profile = await whoopGet(
      'https://api.prod.whoop.com/developer/v1/user/profile/basic',
      accessToken
    );
    console.log('[whoop-sync] profile OK, whoop user_id:', profile.user_id);

    // Obtener datos de sueño directamente (sin pasar por recovery)
    console.log('[whoop-sync] fetching sleep collection...');
    const sleepPage = await whoopGet(
      'https://api.prod.whoop.com/developer/v1/activity/sleep?limit=25',
      accessToken
    );
    console.log('[whoop-sync] sleep OK, records:', sleepPage.records?.length ?? 0);

    const allSleeps = sleepPage.records || [];

    // Fechas ya guardadas para deduplicar
    const { data: existingSleeps } = await supabase
      .from('whoop_sleep').select('date').eq('user_email', email);
    const existingDates = new Set((existingSleeps || []).map(s => s.date));

    let imported = 0;
    let skipped = 0;

    for (const sleep of allSleeps) {
      // Usar la fecha de fin del sueño como fecha (el día que "pertenece" ese sueño)
      const endTime = sleep.end || sleep.created_at;
      if (!endTime) { skipped++; continue; }
      const date = endTime.split('T')[0]; // YYYY-MM-DD

      if (existingDates.has(date)) { skipped++; continue; }

      const stages = sleep.score?.stage_summary || {};
      const totalMilli = stages.total_in_bed_time_milli || stages.total_sleep_time_milli || 0;

      const { error: insertError } = await supabase
        .from('whoop_sleep')
        .insert({
          user_id,
          user_email: email,
          date,
          score: null, // recovery score no disponible desde sleep endpoint
          duration_minutes: Math.round(totalMilli / 60000) || null,
          efficiency: sleep.score?.sleep_efficiency_percentage ?? null,
          rem_minutes: Math.round((stages.total_rem_sleep_time_milli || 0) / 60000) || null,
          deep_minutes: Math.round((stages.total_slow_wave_sleep_time_milli || 0) / 60000) || null,
          light_minutes: Math.round((stages.total_light_sleep_time_milli || 0) / 60000) || null,
          awake_minutes: Math.round((stages.total_awake_time_milli || 0) / 60000) || null,
          raw_data: { whoop_sleep_id: sleep.id, ...sleep },
        });

      if (!insertError) {
        imported++;
        existingDates.add(date);
      } else {
        console.error('[whoop-sync] insert error:', insertError.message);
      }
    }

    return res.status(200).json({ success: true, imported, skipped });
  } catch (err) {
    console.error('[whoop-sync] error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
