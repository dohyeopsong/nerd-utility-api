// routes/jwt.js — JWT decode/inspect (no verification, header+payload claims)
// GET /jwt?token=<jwt>
function b64urlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64').toString('utf8');
}
function routeJwt(u, res, json) {
  const token = u.searchParams.get('token');
  if (!token) return json(res, 400, { error: 'token required' });
  const parts = token.split('.');
  if (parts.length < 2 || parts.length > 5) return json(res, 400, { error: 'invalid JWT: expected 3 dot-separated parts' });
  let header, payload;
  try {
    header = JSON.parse(b64urlDecode(parts[0]));
    payload = JSON.parse(b64urlDecode(parts[1]));
  } catch (e) { return json(res, 400, { error: 'invalid JWT encoding: ' + e.message }); }
  const now = Math.floor(Date.now() / 1000);
  const claims = {};
  if (payload.exp != null) claims.exp = { value: payload.exp, expired: payload.exp < now, expiresAt: new Date(payload.exp * 1000).toISOString() };
  if (payload.iat != null) claims.iat = { value: payload.iat, issuedAt: new Date(payload.iat * 1000).toISOString() };
  if (payload.nbf != null) claims.nbf = { value: payload.nbf, notYetValid: payload.nbf > now };
  return json(res, 200, {
    header, payload, signature: parts[2] || null,
    claims,
    status: claims.exp ? (claims.exp.expired ? 'EXPIRED' : 'valid (signature NOT verified)') : 'no expiry (signature NOT verified)'
  });
}
module.exports = { routeJwt };
