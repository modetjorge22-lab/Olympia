export default function handler(req, res) {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const params = new URLSearchParams({
    client_id: process.env.WHOOP_CLIENT_ID,
    redirect_uri: `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/whoop-callback`,
    response_type: 'code',
    scope: 'offline read:sleep read:recovery read:profile',
    state: email,
  });

  res.redirect(`https://api.prod.whoop.com/oauth/oauth2/auth?${params}`);
}
