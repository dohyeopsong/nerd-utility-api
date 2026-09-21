// JWT decoder: header/payload decode only (no signature verification)
function b64urlToBuffer(s) {
  const b = s.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(b + '='.repeat((4 - b.length % 4) % 4), 'base64');
}
function routeJwt(u, res, json) {
  const token = u.searchParams.get('token');
  if (!token) return json(res, 400, { error: 'missing token param' });
  const parts = token.split('.');
  if (parts.length !== 3) return json(res, 400, { error: 'malformed JWT (expected 3 parts)' });
  let header, payload;
  try {
    header = JSON.parse(b64urlToBuffer(parts[0]).toString('utf8'));
    payload = JSON.parse(b64urlToBuffer(parts[1]).toString('utf8'));
  } catch (e) {
    return json(res, 400, { error: 'invalid base64/JSON: ' + e.message });
  }
  const now = Math.floor(Date.now() / 1000);
  const exp = payload.exp ?? null;
  let status = 'unknown';
  if (exp) status = now >= exp ? 'expired' : 'valid';
  return json(res, 200, {
    header, payload,
    signature: parts[2],
    issuedAt: payload.iat ? new Date(payload.iat * 1000).toISOString() : null,
    expiresAt: exp ? new Date(exp * 1000).toISOString() : null,
    expiryStatus: status
  });
}
module.exports = { routeJwt };
