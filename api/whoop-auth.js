import { getAuthedUser, signState } from './_lib/auth.js';

// El cliente llama con su JWT y recibe la URL de autorización de Whoop.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await getAuthedUser(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });

  const params = new URLSearchParams({
    client_id: process.env.WHOOP_CLIENT_ID,
    redirect_uri: 'https://olympia-navy.vercel.app/api/whoop-callback',
    response_type: 'code',
    scope: 'offline read:sleep read:recovery read:profile',
    state: signState(user),
  });

  return res.status(200).json({ url: `https://api.prod.whoop.com/oauth/oauth2/auth?${params}` });
}
