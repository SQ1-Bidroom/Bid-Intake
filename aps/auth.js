import 'dotenv/config';

let _token = null;
let _tokenExpiry = 0;

export async function getAccessToken() {
  if (_token && Date.now() < _tokenExpiry - 60000) {
    return _token;
  }

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'data:read',
  });

  const response = await fetch(`${process.env.APS_BASE_URL}/authentication/v2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        `${process.env.APS_CLIENT_ID}:${process.env.APS_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: params,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`APS auth failed: ${response.status} ${err}`);
  }

  const data = await response.json();
  _token = data.access_token;
  _tokenExpiry = Date.now() + data.expires_in * 1000;
  return _token;
}
