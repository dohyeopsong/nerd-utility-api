// JWT decoder: base64url decode header+payload, no verification, expiry check
function b64urlToJson(s) {
  const pad = s.replace(/-/g, '+').replace(/_/g, '/');
  const buf = Buffer.from(pad + '='.repeat((4 - pad.length % 4) % 4), 'base64');
  const str = buf.toString('utf8');
  const obj = JSON.parse(str); // throws on invalid JSON
  return obj;
}
function routeJwt(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  const token = q.token || q.jwt || q.t || '';
  if (!token) return json(res, 400, { error: 'provide ?token=<JWT> (decoded only, NOT verified)' });
  const parts = token.trim().split('.');
  if (parts.length !== 3) return json(res, 400, { error: `expected 3 dot-separated parts, got ${parts.length}` });
  try {
    const header = b64urlToJson(parts[0]);
    const payload = b64urlToJson(parts[1]);
    const now = Math.floor(Date.now() / 1000);
    const claims = {};
    if (payload.exp) claims.exp = { value: payload.exp, expired: now > payload.exp, secondsAgo: now - payload.exp };
    if (payload.nbf) claims.nbf = { value: payload.nbf, active: now >= payload.nbf };
    if (payload.iat) claims.iat = { value: payload.iat, issuedSecondsAgo: now - payload.iat };
    return json(res, 200, {
      header, payload, claims,
      algorithm: header.alg || null, keyId: header.kid || null,
      signaturePresent: parts[2].length > 0,
      expired: payload.exp ? now > payload.exp : null,
      warning: 'signature not verified — do not use for auth decisions',
    });
  } catch (e) {
    return json(res, 400, { error: `decode failed: ${e.message}` });
  }
}
module.exports = { routeJwt };
