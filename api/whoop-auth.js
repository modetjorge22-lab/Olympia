import { getAuthedUser, signState } from './_lib/auth.js';
import { WHOOP_AUTH_URL, WHOOP_REDIRECT_URI, WHOOP_SCOPES } from './_lib/whoop.js';

// El cliente llama con su JWT y recibe la URL de autorización de WHOOP.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await getAuthedUser(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });

  const params = new URLSearchParams({
    client_id: process.env.WHOOP_CLIENT_ID,
    redirect_uri: WHOOP_REDIRECT_URI,
    response_type: 'code',
    scope: WHOOP_SCOPES,
    state: signState(user),
  });

  return res.status(200).json({ url: `${WHOOP_AUTH_URL}?${params}` });
}
