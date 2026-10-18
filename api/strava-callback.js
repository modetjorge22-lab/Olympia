import { adminClient, verifyState } from './_lib/auth.js';

export default async function handler(req, res) {
  const { code, state } = req.query;

  if (!code) {
    return res.redirect(`${process.env.SITE_URL}/mas?strava=error&reason=no_code`);
  }

  // El state lo firmó /api/strava-auth para el usuario con sesión.
  const owner = verifyState(state);
  if (!owner) {
    return res.redirect(`${process.env.SITE_URL}/mas?strava=error&reason=bad_state`);
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

    // Diagnóstico: qué scope concedió realmente el usuario (aparece en los logs de Vercel)
    console.log('Strava token exchange — granted scope:', tokenData.scope, '| athlete:', tokenData.athlete?.id, '| user:', owner.uid);

    if (!tokenResponse.ok || !tokenData.access_token) {
      return res.redirect(`${process.env.SITE_URL}/mas?strava=error&reason=token_exchange`);
    }

    const supabase = adminClient();

    // Upsert strava token
    const { error } = await supabase
      .from('strava_tokens')
      .upsert({
        user_id: owner.uid,
        user_email: owner.email,
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
    await supabase
      .from('team_members')
      .update({ strava_connected: true })
      .eq('user_id', owner.uid);

    return res.redirect(`${process.env.SITE_URL}/mas?strava=success`);
  } catch (err) {
    console.error('Strava callback error:', err);
    return res.redirect(`${process.env.SITE_URL}/mas?strava=error&reason=unknown`);
  }
}
