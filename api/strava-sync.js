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

    // Get ALL weekly plans for this user — usados para auto-match con actividades
    // recién sincronizadas. La prioridad de "description" la lleva el plan.notes
    // (el nombre que el usuario apuntó en la app), no el sa.name de Strava.
    const { data: existingPlans } = await supabase
      .from('weekly_plans')
      .select('*')
      .eq('user_email', email);

    const plans = existingPlans || [];
    const consumedPlanIds = new Set();

    // Devuelve un plan no-consumido para el día y tipo dados, o null.
    const findPlan = (date, type) => {
      return plans.find(p =>
        !consumedPlanIds.has(p.id) &&
        p.date === date &&
        p.activity_type === type
      );
    };

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let plansConsumed = 0;

    for (const sa of stravaActivities) {
      const stravaId = String(sa.id);
      // sport_type es más específico que type (ej: Padel vs Workout genérico)
      const type = ACTIVITY_TYPE_MAP[sa.sport_type] || ACTIVITY_TYPE_MAP[sa.type] || 'other';
      const date = sa.start_date_local.split('T')[0];
      const durationMins = Math.round(sa.elapsed_time / 60);
      const distanceKm = sa.distance ? +(sa.distance / 1000).toFixed(2) : null;

      // 1. Check if this exact Strava activity was already imported
      const alreadyImported = existing.find(a => a.strava_id === stravaId);
      if (alreadyImported) {
        skipped++;
        continue;
      }

      // Reglas de prioridad para "description" (nombre de la actividad):
      // 1º — la que ya tenga el usuario apuntada en una activity manual existente
      // 2º — la que tenga apuntada en un plan (plan.notes)
      // 3º — el nombre que viene de Strava (sa.name)
      const matchedPlan = findPlan(date, type);

      // 2. Check if there's a manual activity on the same date with the same type
      const manualMatch = existing.find(a =>
        a.source === 'manual' &&
        a.date === date &&
        a.type === type &&
        !a.strava_id
      );

      if (manualMatch) {
        // Mantenemos el description original del usuario — no lo modificamos.
        await supabase
          .from('activities')
          .update({
            duration_minutes: durationMins,
            distance_km: distanceKm,
            calories_burned: sa.calories || null,
            strava_id: stravaId,
          })
          .eq('id', manualMatch.id);

        // Si había un plan correspondiente, también lo retiramos (se ha cumplido)
        if (matchedPlan) {
          await supabase.from('weekly_plans').delete().eq('id', matchedPlan.id);
          consumedPlanIds.add(matchedPlan.id);
          plansConsumed++;
        }

        // Mark as processed so we don't match it again
        manualMatch.strava_id = stravaId;
        updated++;
        continue;
      }

      // 3. Actividad manual del mismo día, MISMO TIPO y duración similar (±15 min)
      // Requiere tipo idéntico — un padel no puede matchear con una sesión de fuerza.
      const similarMatch = existing.find(a =>
        a.date === date &&
        a.type === type &&
        !a.strava_id &&
        Math.abs((a.duration_minutes || 0) - durationMins) <= 15
      );

      if (similarMatch) {
        // Mantenemos description original; sólo actualizamos datos numéricos.
        await supabase
          .from('activities')
          .update({
            type: type,
            title: TYPE_LABELS[type] || sa.name,
            duration_minutes: durationMins,
            distance_km: distanceKm,
            calories_burned: sa.calories || null,
            strava_id: stravaId,
          })
          .eq('id', similarMatch.id);

        if (matchedPlan) {
          await supabase.from('weekly_plans').delete().eq('id', matchedPlan.id);
          consumedPlanIds.add(matchedPlan.id);
          plansConsumed++;
        }

        similarMatch.strava_id = stravaId;
        updated++;
        continue;
      }

      // 4. No match found — import as new activity.
      // Si hay plan para ese día+tipo, su `notes` se convierte en `description`
      // (prioridad sobre el nombre que viene de Strava).
      const description = matchedPlan?.notes || sa.name;

      const { error: insertError } = await supabase
        .from('activities')
        .insert({
          user_id: tokenRecord.user_id,
          user_email: email,
          type,
          title: TYPE_LABELS[type] || sa.name,
          description,
          date,
          duration_minutes: durationMins,
          distance_km: distanceKm,
          calories_burned: sa.calories || null,
          source: 'strava',
          strava_id: stravaId,
          completed: true,
        });

      if (!insertError) {
        imported++;
        // El plan se ha cumplido — lo retiramos
        if (matchedPlan) {
          await supabase.from('weekly_plans').delete().eq('id', matchedPlan.id);
          consumedPlanIds.add(matchedPlan.id);
          plansConsumed++;
        }
      }
    }

    return res.status(200).json({
      success: true,
      imported,
      updated,
      skipped,
      plansConsumed,
      total: stravaActivities.length,
    });
  } catch (err) {
    console.error('Sync error:', err);
    return res.status(500).json({ error: err.message });
  }
}
