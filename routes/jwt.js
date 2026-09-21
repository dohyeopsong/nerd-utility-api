// JWT decoder: header, payload, expiry check. No signature verification (decode only).
function b64uDecode(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(b64, 'base64').toString('utf8');
}
function routeJwt(u, res, json) {
  const token = (u.searchParams.get('token') || '').trim();
  if (!token) return json(res, 400, { error: 'missing token param' });
  const parts = token.split('.');
  if (parts.length !== 3) return json(res, 400, { error: 'invalid JWT: expected 3 segments' });
  let header, payload;
  try {
    header = JSON.parse(b64uDecode(parts[0]));
    payload = JSON.parse(b64uDecode(parts[1]));
  } catch (e) { return json(res, 400, { error: 'invalid base64/JSON in token' }); }
  const now = Math.floor(Date.now() / 1000);
  const exp = payload.exp ? { expired: now >= payload.exp, expiresAt: new Date(payload.exp * 1000).toISOString() } : null;
  return json(res, 200, { header, payload, signature: parts[2], timeChecked: new Date(now * 1000).toISOString(), exp });
}
module.exports = { routeJwt };
