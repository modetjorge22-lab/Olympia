import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { code, state: email, error } = req.query;

  if (error || !code || !email) {
    return res.redirect('/?whoop=error');
  }

  try {
    const redirectUri = `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/whoop-callback`;

    // Intercambiar code por tokens
    const tokenRes = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: process.env.WHOOP_CLIENT_ID,
        client_secret: process.env.WHOOP_CLIENT_SECRET,
      }),
    });

    if (!tokenRes.ok) {
      console.error('Whoop token exchange failed:', await tokenRes.text());
      return res.redirect('/mas?whoop=error');
    }

    const tokens = await tokenRes.json();
    const { access_token, refresh_token, expires_in } = tokens;
    const expires_at = Math.floor(Date.now() / 1000) + expires_in;

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Guardar tokens en whoop_tokens
    const { error: upsertError } = await supabase
      .from('whoop_tokens')
      .upsert(
        { user_email: email, access_token, refresh_token, expires_at },
        { onConflict: 'user_email' }
      );

    if (upsertError) {
      console.error('Whoop token save error:', upsertError);
      return res.redirect('/mas?whoop=error');
    }

    // Marcar whoop_connected en team_members
    await supabase
      .from('team_members')
      .update({ whoop_connected: true })
      .eq('email', email);

    res.redirect('/mas?whoop=success');
  } catch (err) {
    console.error('Whoop callback error:', err);
    res.redirect('/mas?whoop=error');
  }
}
