import { createClient } from '@supabase/supabase-js';

async function refreshWhoopToken(supabase, tokenRecord) {
  const basicAuth = Buffer.from(
    `${process.env.WHOOP_CLIENT_ID}:${process.env.WHOOP_CLIENT_SECRET}`
  ).toString('base64');

  const res = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokenRecord.refresh_token,
    }),
  });

  if (!res.ok) throw new Error('Failed to refresh Whoop token');
  const data = await res.json();
  const expires_at = Math.floor(Date.now() / 1000) + (data.expires_in || 3600);

  await supabase
    .from('whoop_tokens')
    .update({ access_token: data.access_token, refresh_token: data.refresh_token || tokenRecord.refresh_token, expires_at })
    .eq('id', tokenRecord.id);

  return data.access_token;
}

async function whoopGet(url, accessToken) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Whoop API error: ${res.status} ${url}`);
  return res.json();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Obtener tokens
    const { data: tokens } = await supabase
      .from('whoop_tokens')
      .select('*')
      .eq('user_email', email)
      .limit(1);

    if (!tokens?.length) return res.status(404).json({ error: 'Whoop not connected' });

    const tokenRecord = tokens[0];
    const now = Math.floor(Date.now() / 1000);
    let accessToken = tokenRecord.access_token;

    if (tokenRecord.expires_at < now) {
      accessToken = await refreshWhoopToken(supabase, tokenRecord);
    }

    // user_id del token (guardado en el callback)
    const user_id = tokenRecord.user_id || null;

    // Sincronizar últimos 90 días
    const start = new Date();
    start.setDate(start.getDate() - 90);
    const startISO = start.toISOString();

    // Obtener fechas ya guardadas para deduplicar por fecha+email
    const { data: existingSleeps } = await supabase
      .from('whoop_sleep')
      .select('date')
      .eq('user_email', email);

    const existingDates = new Set((existingSleeps || []).map(s => s.date));

    // Paginar registros de sueño
    let allSleeps = [];
    let nextToken = null;
    do {
      const params = new URLSearchParams({
        start: startISO,
        limit: '25',
        ...(nextToken ? { nextToken } : {}),
      });
      const page = await whoopGet(
        `https://api.prod.whoop.com/developer/v1/activity/sleep?${params}`,
        accessToken
      );
      allSleeps = allSleeps.concat(page.records || []);
      nextToken = page.next_token;
    } while (nextToken);

    // Recovery para cruzar recovery_score con el sueño
    let allRecoveries = [];
    nextToken = null;
    do {
      const params = new URLSearchParams({
        start: startISO,
        limit: '25',
        ...(nextToken ? { nextToken } : {}),
      });
      const page = await whoopGet(
        `https://api.prod.whoop.com/developer/v1/recovery?${params}`,
        accessToken
      );
      allRecoveries = allRecoveries.concat(page.records || []);
      nextToken = page.next_token;
    } while (nextToken);

    const recoveryBySleepId = {};
    allRecoveries.forEach(r => {
      if (r.sleep_id) recoveryBySleepId[r.sleep_id] = r.score?.recovery_score ?? null;
    });

    let imported = 0;
    let skipped = 0;

    for (const sleep of allSleeps) {
      // Ignorar siestas
      if (sleep.nap) { skipped++; continue; }

      // Fecha = día en que se despertó (fin del sueño)
      const endDate = sleep.end ? sleep.end.split('T')[0] : null;
      if (!endDate) { skipped++; continue; }

      // Deduplicar por fecha
      if (existingDates.has(endDate)) { skipped++; continue; }

      const stages = sleep.score?.stage_summary || {};
      const durationMins = Math.round((stages.total_in_bed_time_milli || 0) / 60000) || null;
      const remMins = Math.round((stages.total_rem_sleep_time_milli || 0) / 60000) || null;
      const deepMins = Math.round((stages.total_slow_wave_sleep_time_milli || 0) / 60000) || null;
      const lightMins = Math.round((stages.total_light_sleep_time_milli || 0) / 60000) || null;
      const awakeMins = Math.round((stages.total_awake_time_milli || 0) / 60000) || null;
      const efficiency = sleep.score?.sleep_efficiency_percentage ?? null;
      const score = recoveryBySleepId[sleep.id] ?? null;

      const { error: insertError } = await supabase
        .from('whoop_sleep')
        .insert({
          user_id,
          user_email: email,
          date: endDate,
          score,
          duration_minutes: durationMins,
          efficiency,
          rem_minutes: remMins,
          deep_minutes: deepMins,
          light_minutes: lightMins,
          awake_minutes: awakeMins,
          raw_data: { whoop_id: sleep.id, ...sleep },
        });

      if (!insertError) {
        imported++;
        existingDates.add(endDate); // evitar duplicado si hay 2 registros el mismo día
      } else {
        console.error('whoop_sleep insert error:', insertError.message);
      }
    }

    return res.status(200).json({ success: true, imported, skipped });
  } catch (err) {
    console.error('Whoop sync error:', err);
    return res.status(500).json({ error: err.message });
  }
}
