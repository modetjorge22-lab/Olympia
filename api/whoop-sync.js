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
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Whoop API error: ${res.status} ${url}`);
  return res.json();
}

async function tryGetSleepDuration(sleepId, accessToken) {
  // Intentar obtener duración de sueño via sleep individual
  try {
    const data = await whoopGet(
      `https://api.prod.whoop.com/developer/v1/activity/sleep/${sleepId}`,
      accessToken
    );
    const stages = data.score?.stage_summary || {};
    const totalMilli = stages.total_in_bed_time_milli || stages.total_sleep_time_milli || 0;
    const remMins = Math.round((stages.total_rem_sleep_time_milli || 0) / 60000) || null;
    const deepMins = Math.round((stages.total_slow_wave_sleep_time_milli || 0) / 60000) || null;
    const lightMins = Math.round((stages.total_light_sleep_time_milli || 0) / 60000) || null;
    const awakeMins = Math.round((stages.total_awake_time_milli || 0) / 60000) || null;
    return {
      duration_minutes: Math.round(totalMilli / 60000) || null,
      efficiency: data.score?.sleep_efficiency_percentage ?? null,
      rem_minutes: remMins,
      deep_minutes: deepMins,
      light_minutes: lightMins,
      awake_minutes: awakeMins,
      raw_data: { whoop_sleep_id: sleepId, ...data },
    };
  } catch (_) {
    return { duration_minutes: null, efficiency: null, rem_minutes: null, deep_minutes: null, light_minutes: null, awake_minutes: null, raw_data: {} };
  }
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
    let accessToken = tokenRecord.expires_at < now
      ? await refreshWhoopToken(supabase, tokenRecord)
      : tokenRecord.access_token;

    const user_id = tokenRecord.user_id || null;

    const start = new Date();
    start.setDate(start.getDate() - 90);
    const startISO = start.toISOString().replace(/\.\d{3}Z$/, 'Z');

    // Fechas ya guardadas para deduplicar
    const { data: existingSleeps } = await supabase
      .from('whoop_sleep').select('date').eq('user_email', email);
    const existingDates = new Set((existingSleeps || []).map(s => s.date));

    // Fuente principal: endpoint de recovery
    // Probamos sin parámetro start para descartar problemas de formato de fecha
    let allRecoveries = [];
    let nextToken = null;
    let pageCount = 0;
    do {
      const params = new URLSearchParams({ limit: '25' });
      if (nextToken) params.set('nextToken', nextToken);
      const url = `https://api.prod.whoop.com/developer/v1/recovery?${params}`;
      console.log(`[whoop-sync] fetching: ${url}`);
      const page = await whoopGet(url, accessToken);
      console.log(`[whoop-sync] page ${++pageCount} records:`, page.records?.length ?? 0);
      allRecoveries = allRecoveries.concat(page.records || []);
      nextToken = page.next_token;
      // Parar después de 3 páginas para el primer test
      if (pageCount >= 3) break;
    } while (nextToken);

    console.log(`[whoop-sync] recovery records fetched: ${allRecoveries.length}`);

    let imported = 0;
    let skipped = 0;

    for (const recovery of allRecoveries) {
      const date = recovery.user_date; // YYYY-MM-DD
      if (!date) { skipped++; continue; }
      if (existingDates.has(date)) { skipped++; continue; }

      const recoveryScore = recovery.score?.recovery_score ?? null;
      const sleepId = recovery.sleep_id;

      // Intentar obtener datos de sueño via sleep individual
      const sleepDetails = sleepId
        ? await tryGetSleepDuration(sleepId, accessToken)
        : { duration_minutes: null, efficiency: null, rem_minutes: null, deep_minutes: null, light_minutes: null, awake_minutes: null, raw_data: {} };

      const { error: insertError } = await supabase
        .from('whoop_sleep')
        .insert({
          user_id,
          user_email: email,
          date,
          score: recoveryScore,
          duration_minutes: sleepDetails.duration_minutes,
          efficiency: sleepDetails.efficiency,
          rem_minutes: sleepDetails.rem_minutes,
          deep_minutes: sleepDetails.deep_minutes,
          light_minutes: sleepDetails.light_minutes,
          awake_minutes: sleepDetails.awake_minutes,
          raw_data: sleepDetails.raw_data,
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
