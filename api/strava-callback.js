import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { code, state } = req.query;

  if (!code) {
    return res.redirect(`${process.env.SITE_URL}/mas?strava=error&reason=no_code`);
  }

  try {
    // Exchange code for token
    const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      return res.redirect(`${process.env.SITE_URL}/mas?strava=error&reason=token_exchange`);
    }

    // Parse state to get user email
    let userEmail = '';
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      userEmail = stateData.email;
    } catch (e) {}

    // Store token in Supabase using service role key
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Find user by email
    const { data: members } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('email', userEmail)
      .limit(1);

    const userId = members?.[0]?.user_id;

    // Upsert strava token
    const { error } = await supabase
      .from('strava_tokens')
      .upsert({
        user_id: userId || null,
        user_email: userEmail,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: tokenData.expires_at,
        athlete_id: String(tokenData.athlete?.id || ''),
      }, { onConflict: 'user_email' });

    if (error) {
      console.error('Error storing token:', error);
      return res.redirect(`${process.env.SITE_URL}/mas?strava=error&reason=db_error`);
    }

    // Update team member strava status
    if (userId) {
      await supabase
        .from('team_members')
        .update({ strava_connected: true })
        .eq('user_id', userId);
    }

    return res.redirect(`${process.env.SITE_URL}/mas?strava=success`);
  } catch (err) {
    console.error('Strava callback error:', err);
    return res.redirect(`${process.env.SITE_URL}/mas?strava=error&reason=unknown`);
  }
}
