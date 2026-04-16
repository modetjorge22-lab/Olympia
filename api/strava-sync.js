import { createClient } from '@supabase/supabase-js';

const ACTIVITY_TYPE_MAP = {
  'Run': 'running',
  'Ride': 'cycling',
  'Swim': 'swimming',
  'Walk': 'hiking',
  'Hike': 'hiking',
  'WeightTraining': 'strength_training',
  'Workout': 'strength_training',
  'Yoga': 'yoga',
  'Tennis': 'tennis',
  'Padel': 'padel',
  'Soccer': 'football',
  'MartialArts': 'martial_arts',
};

const TYPE_LABELS = {
  running: 'Running', cycling: 'Ciclismo', swimming: 'Natación',
  hiking: 'Senderismo', strength_training: 'Fuerza', yoga: 'Yoga',
  tennis: 'Tenis', padel: 'Pádel', football: 'Fútbol',
  martial_arts: 'Artes marciales', other: 'Otro',
};

async function refreshToken(supabase, tokenRecord) {
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: tokenRecord.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error('Failed to refresh token');

  await supabase
    .from('strava_tokens')
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
    })
    .eq('id', tokenRecord.id);

  return data.access_token;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get strava token
    const { data: tokens, error: tokenError } = await supabase
      .from('strava_tokens')
      .select('*')
      .eq('user_email', email)
      .limit(1);

    if (tokenError || !tokens?.length) {
      return res.status(404).json({ error: 'Strava not connected' });
    }

    const tokenRecord = tokens[0];
    let accessToken = tokenRecord.access_token;

    // Refresh token if expired
    const now = Math.floor(Date.now() / 1000);
    if (tokenRecord.expires_at < now) {
      accessToken = await refreshToken(supabase, tokenRecord);
    }

    // Fetch activities from Strava (last 90 days)
    const after = Math.floor(Date.now() / 1000) - (90 * 24 * 60 * 60);
    const stravaResponse = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=200`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    if (!stravaResponse.ok) {
      return res.status(500).json({ error: 'Failed to fetch Strava activities' });
    }

    const stravaActivities = await stravaResponse.json();

    // Get ALL existing activities for this user (both manual and strava)
    const { data: existingActivities } = await supabase
      .from('activities')
      .select('*')
      .eq('user_email', email);

    const existing = existingActivities || [];

    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const sa of stravaActivities) {
      const stravaId = String(sa.id);
      const type = ACTIVITY_TYPE_MAP[sa.type] || ACTIVITY_TYPE_MAP[sa.sport_type] || 'other';
      const date = sa.start_date_local.split('T')[0];
      const durationMins = Math.round(sa.elapsed_time / 60);
      const distanceKm = sa.distance ? +(sa.distance / 1000).toFixed(2) : null;

      // 1. Check if this exact Strava activity was already imported
      const alreadyImported = existing.find(a => a.strava_id === stravaId);
      if (alreadyImported) {
        skipped++;
        continue;
      }

      // 2. Check if there's a manual activity on the same date with the same type
      const manualMatch = existing.find(a =>
        a.source === 'manual' &&
        a.date === date &&
        a.type === type &&
        !a.strava_id
      );

      if (manualMatch) {
        // Update the manual activity with Strava data (more precise)
        await supabase
          .from('activities')
          .update({
            duration_minutes: durationMins,
            distance_km: distanceKm,
            calories_burned: sa.calories || null,
            strava_id: stravaId,
            description: manualMatch.description
              ? `${manualMatch.description} (Actualizado desde Strava)`
              : sa.name,
          })
          .eq('id', manualMatch.id);

        // Mark as processed so we don't match it again
        manualMatch.strava_id = stravaId;
        updated++;
        continue;
      }

      // 3. Check if there's ANY activity on the same date with similar duration (±15 min)
      const similarMatch = existing.find(a =>
        a.date === date &&
        !a.strava_id &&
        Math.abs((a.duration_minutes || 0) - durationMins) <= 15
      );

      if (similarMatch) {
        // Update with Strava data
        await supabase
          .from('activities')
          .update({
            type: type,
            title: TYPE_LABELS[type] || sa.name,
            duration_minutes: durationMins,
            distance_km: distanceKm,
            calories_burned: sa.calories || null,
            strava_id: stravaId,
            description: similarMatch.description
              ? `${similarMatch.description} (Actualizado desde Strava)`
              : sa.name,
          })
          .eq('id', similarMatch.id);

        similarMatch.strava_id = stravaId;
        updated++;
        continue;
      }

      // 4. No match found — import as new activity
      const { error: insertError } = await supabase
        .from('activities')
        .insert({
          user_id: tokenRecord.user_id,
          user_email: email,
          type,
          title: TYPE_LABELS[type] || sa.name,
          description: sa.name,
          date,
          duration_minutes: durationMins,
          distance_km: distanceKm,
          calories_burned: sa.calories || null,
          source: 'strava',
          strava_id: stravaId,
          completed: true,
        });

      if (!insertError) imported++;
    }

    return res.status(200).json({
      success: true,
      imported,
      updated,
      skipped,
      total: stravaActivities.length,
    });
  } catch (err) {
    console.error('Sync error:', err);
    return res.status(500).json({ error: err.message });
  }
}
