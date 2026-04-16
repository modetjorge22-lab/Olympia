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

  // Update token in database
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

    // Get strava token for user
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

    // Check if token expired, refresh if needed
    const now = Math.floor(Date.now() / 1000);
    if (tokenRecord.expires_at < now) {
      accessToken = await refreshToken(supabase, tokenRecord);
    }

    // Fetch activities from Strava (last 60 days)
    const after = Math.floor(Date.now() / 1000) - (60 * 24 * 60 * 60);
    const stravaResponse = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=100`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    if (!stravaResponse.ok) {
      return res.status(500).json({ error: 'Failed to fetch Strava activities' });
    }

    const stravaActivities = await stravaResponse.json();

    // Get existing strava activities to avoid duplicates
    const { data: existingActivities } = await supabase
      .from('activities')
      .select('strava_id')
      .eq('user_email', email)
      .eq('source', 'strava')
      .not('strava_id', 'is', null);

    const existingStravaIds = new Set((existingActivities || []).map(a => a.strava_id));

    // Import new activities
    const newActivities = stravaActivities
      .filter(sa => !existingStravaIds.has(String(sa.id)))
      .map(sa => {
        const type = ACTIVITY_TYPE_MAP[sa.type] || ACTIVITY_TYPE_MAP[sa.sport_type] || 'other';
        const typeLabels = {
          running: 'Running', cycling: 'Ciclismo', swimming: 'Natación',
          hiking: 'Senderismo', strength_training: 'Fuerza', yoga: 'Yoga',
          tennis: 'Tenis', padel: 'Pádel', football: 'Fútbol',
          martial_arts: 'Artes marciales', other: 'Otro',
        };

        return {
          user_id: tokenRecord.user_id,
          user_email: email,
          type,
          title: typeLabels[type] || sa.name,
          description: sa.name,
          date: sa.start_date_local.split('T')[0],
          duration_minutes: Math.round(sa.elapsed_time / 60),
          distance_km: sa.distance ? +(sa.distance / 1000).toFixed(2) : null,
          calories_burned: sa.calories || null,
          source: 'strava',
          strava_id: String(sa.id),
          completed: true,
        };
      });

    if (newActivities.length > 0) {
      const { error: insertError } = await supabase
        .from('activities')
        .insert(newActivities);

      if (insertError) {
        console.error('Insert error:', insertError);
        return res.status(500).json({ error: 'Failed to import activities' });
      }
    }

    return res.status(200).json({
      success: true,
      imported: newActivities.length,
      total: stravaActivities.length,
    });
  } catch (err) {
    console.error('Sync error:', err);
    return res.status(500).json({ error: err.message });
  }
}
