import { createClient } from '@supabase/supabase-js';

const REDIRECT_URI = 'https://olympia-navy.vercel.app/api/whoop-callback';

export default async function handler(req, res) {
  const { code, state: email, error } = req.query;

  console.log('[whoop-callback] code:', !!code, '| email:', email, '| error:', error);

  if (error) {
    console.error('[whoop-callback] Whoop returned error:', error);
    return res.redirect('/mas?whoop=error');
  }

  if (!code) {
    console.error('[whoop-callback] Missing code');
    return res.redirect('/mas?whoop=error');
  }

  if (!email) {
    console.error('[whoop-callback] Missing email in state');
    return res.redirect('/mas?whoop=error');
  }

  try {
    // 1. Intercambiar code por tokens
    // Whoop requiere credenciales como Basic Auth header
    const basicAuth = Buffer.from(
      `${process.env.WHOOP_CLIENT_ID}:${process.env.WHOOP_CLIENT_SECRET}`
    ).toString('base64');

    const tokenRes = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokenText = await tokenRes.text();
    console.log('[whoop-callback] token exchange status:', tokenRes.status, '| body:', tokenText);

    if (!tokenRes.ok) {
      return res.redirect('/mas?whoop=error');
    }

    const tokens = JSON.parse(tokenText);
    const { access_token, refresh_token, expires_in } = tokens;
    const expires_at = Math.floor(Date.now() / 1000) + (expires_in || 3600);

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 2. Buscar user_id a partir del email
    const { data: member } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('email', email)
      .single();

    const user_id = member?.user_id || null;
    console.log('[whoop-callback] user_id:', user_id);

    // 3. Guardar tokens
    const { error: upsertError } = await supabase
      .from('whoop_tokens')
      .upsert(
        { user_email: email, user_id, access_token, refresh_token, expires_at },
        { onConflict: 'user_email' }
      );

    if (upsertError) {
      console.error('[whoop-callback] upsert error:', upsertError.message);
      return res.redirect('/mas?whoop=error');
    }

    // 4. Marcar whoop_connected en team_members
    await supabase
      .from('team_members')
      .update({ whoop_connected: true })
      .eq('email', email);

    console.log('[whoop-callback] success for', email);
    return res.redirect('/mas?whoop=success');

  } catch (err) {
    console.error('[whoop-callback] unexpected error:', err.message);
    return res.redirect('/mas?whoop=error');
  }
}
