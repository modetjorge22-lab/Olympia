import { adminClient, verifyState } from './_lib/auth.js';

const REDIRECT_URI = 'https://olympia-navy.vercel.app/api/whoop-callback';

export default async function handler(req, res) {
  const { code, state, error } = req.query;

  console.log('[whoop-callback] code:', !!code, '| error:', error);

  if (error) {
    console.error('[whoop-callback] Whoop returned error:', error);
    return res.redirect('/mas?whoop=error');
  }

  if (!code) {
    console.error('[whoop-callback] Missing code');
    return res.redirect('/mas?whoop=error');
  }

  // El state lo firmó /api/whoop-auth para el usuario con sesión.
  const owner = verifyState(state);
  if (!owner) {
    console.error('[whoop-callback] Invalid or expired state');
    return res.redirect('/mas?whoop=error');
  }

  try {
    // 1. Intercambiar code por tokens
    const tokenRes = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: process.env.WHOOP_CLIENT_ID,
        client_secret: process.env.WHOOP_CLIENT_SECRET,
      }),
    });

    // No se registra el cuerpo: contiene los tokens.
    console.log('[whoop-callback] token exchange status:', tokenRes.status);

    if (!tokenRes.ok) {
      return res.redirect('/mas?whoop=error');
    }

    const tokens = await tokenRes.json();
    const { access_token, refresh_token = '', expires_in } = tokens;
    const expires_at = Math.floor(Date.now() / 1000) + (expires_in || 3600);

    const supabase = adminClient();

    // 2. Guardar tokens
    const { error: upsertError } = await supabase
      .from('whoop_tokens')
      .upsert(
        { user_email: owner.email, user_id: owner.uid, access_token, refresh_token, expires_at },
        { onConflict: 'user_email' }
      );

    if (upsertError) {
      console.error('[whoop-callback] upsert error:', upsertError.message);
      return res.redirect('/mas?whoop=error');
    }

    // 3. Marcar whoop_connected en team_members
    await supabase
      .from('team_members')
      .update({ whoop_connected: true })
      .eq('user_id', owner.uid);

    console.log('[whoop-callback] success for', owner.uid);
    return res.redirect('/mas?whoop=success');

  } catch (err) {
    console.error('[whoop-callback] unexpected error:', err.message);
    return res.redirect('/mas?whoop=error');
  }
}
