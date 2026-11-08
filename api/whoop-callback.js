import { adminClient, verifyState } from './_lib/auth.js';
import { exchangeCode, fullSync, whoopGet } from './_lib/whoop.js';

// WHOOP vuelve aquí tras el "Permitir". El state firmado dice quién es el
// usuario de Olympia; nunca nos fiamos de un email que llegue en claro.
export default async function handler(req, res) {
  const { code, state, error } = req.query;
  const fail = reason => {
    console.error('[whoop-callback]', reason);
    return res.redirect(302, '/mas?whoop=error');
  };

  if (error) return fail(`whoop error: ${error}`);
  if (!code) return fail('missing code');
  const who = verifyState(state);
  if (!who) return fail('invalid or expired state');

  try {
    const tokens = await exchangeCode(code);
    const sb = adminClient();

    const row = {
      user_id: who.uid,
      user_email: who.email,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expires_at: Math.floor(Date.now() / 1000) + (tokens.expires_in || 3600),
      scope: tokens.scope || null,
      consent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // user_id de WHOOP: es lo que traen los webhooks para saber de quién son.
    const profile = await whoopGet(sb, row, '/v2/user/profile/basic');
    row.whoop_user_id = profile?.user_id ?? null;

    // Una cuenta de WHOOP solo puede estar enlazada a un usuario de Olympia.
    if (row.whoop_user_id) {
      await sb.from('whoop_tokens').delete().eq('whoop_user_id', row.whoop_user_id).neq('user_email', who.email);
    }

    const { data: saved, error: upsertError } = await sb.from('whoop_tokens')
      .upsert(row, { onConflict: 'user_email' }).select('*').single();
    if (upsertError) return fail(`upsert: ${upsertError.message}`);

    await sb.from('team_members').update({ whoop_connected: true }).eq('email', who.email);

    // Primera importación: entrenos de 30 días y sueño de 120 (16 semanas). Si falla, el webhook y el
    // sync al abrir la app lo completan; la conexión ya está hecha.
    let counts = null;
    try {
      counts = await fullSync(sb, saved, 30, { sleepDays: 120 });
    } catch (err) {
      console.error('[whoop-callback] initial sync failed:', err.message);
    }

    const q = counts ? `&w=${counts.imported + counts.linked}&s=${counts.sleeps}` : '';
    return res.redirect(302, `/mas?whoop=success${q}`);
  } catch (err) {
    return fail(err.message);
  }
}
