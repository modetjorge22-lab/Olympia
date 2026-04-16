export default function handler(req, res) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = `${process.env.SITE_URL}/api/strava-callback`;
  const scope = 'activity:read_all';

  // Get user email from query to pass through state
  const userEmail = req.query.email || '';
  const state = Buffer.from(JSON.stringify({ email: userEmail })).toString('base64');

  const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}&approval_prompt=auto`;

  res.redirect(authUrl);
}
