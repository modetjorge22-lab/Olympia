export default function handler(req, res) {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const params = new URLSearchParams({
    client_id: process.env.WHOOP_CLIENT_ID,
    redirect_uri: 'https://olympia-navy.vercel.app/api/whoop-callback',
    response_type: 'code',
    scope: 'read:sleep read:recovery read:profile',
    state: email,
  });

  res.redirect(`https://api.prod.whoop.com/oauth/oauth2/auth?${params}`);
}
