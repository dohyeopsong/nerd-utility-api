// JWT decoder: base64url decode header+payload, check expiry (no signature verification)
function b64urlDecode(s) {
  const b = Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  return JSON.parse(b.toString('utf8'));
}
function decodeJWT(token) {
  const parts = String(token).trim().split('.');
  if (parts.length < 2 || parts.length > 3) throw new Error('invalid JWT: expected 3 dot-separated parts');
  const header = b64urlDecode(parts[0]);
  const payload = b64urlDecode(parts[1]);
  const now = Math.floor(Date.now() / 1000);
  let expiry = null;
  if (typeof payload.exp === 'number') expiry = { exp: payload.exp, expiresAt: new Date(payload.exp * 1000).toISOString(), expired: now >= payload.exp };
  let issuedAt = null;
  if (typeof payload.iat === 'number') issuedAt = new Date(payload.iat * 1000).toISOString();
  return { header, payload, issuedAt, expiry, signature: parts[2] || null, alg: header.alg || null, subject: payload.sub || null };
}
function routeJwt(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  const token = (q.token || q.number || (u.pathname === '/jwt' && false);
  if (!token) return json(res, 400, { error: 'provide ?token=<jwt>' });
  try {
    const d = decodeJWT(token);
    return json(res, 200, { ...d, note: 'decoded only; signature NOT verified' });
  } catch (e) { return json(res, 400, { error: e.message }); }
}
module.exports = { routeJwt, decodeJWT };
