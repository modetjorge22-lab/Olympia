import { getAuthedUser, signState } from './_lib/auth.js';

// El cliente llama con su JWT y recibe la URL de autorización de Strava.
// El state va firmado con el id del usuario (ver _lib/auth.js).
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getAuthedUser(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });

  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = `${process.env.SITE_URL}/api/strava-callback`;
  const scope = 'read,activity:read_all';
  const state = signState(user);

  const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}&approval_prompt=force`;

  return res.status(200).json({ url: authUrl });
}
