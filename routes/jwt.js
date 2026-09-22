// /jwt — decode a JWT (unverified): header, payload, expiry check, time-to-live
function b64urlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64').toString('utf8');
}
function routeJwt(u, res, json) {
  const q = u.searchParams;
  const token = q.get('token') || '';
  const body = q.get('token') ? undefined : (typeof reqBodyCache !== 'undefined' ? null : null);
  if (!token) return json(res, 400, { error: 'token required (JWT string)' });
  const parts = token.trim().split('.');
  if (parts.length !== 3) return json(res, 400, { error: 'invalid JWT: expected 3 dot-separated parts' });
  let header, payload;
  try {
    header = JSON.parse(b64urlDecode(parts[0]));
    payload = JSON.parse(b64urlDecode(parts[1]));
  } catch (e) {
    return json(res, 400, { error: 'failed to decode base64url JSON: ' + e.message });
  }
  const now = Math.floor(Date.now() / 1000);
  let expStatus = 'unknown';
  if (typeof payload.exp === 'number') {
    expStatus = payload.exp < now ? 'expired' : 'valid';
    payload._exp_status = expStatus;
    payload._ttl_seconds = payload.exp - now;
  }
  return json(res, 200, {
    header,
    payload,
    signature: parts[2],
    expired: expStatus === 'expired',
    expires_at: payload.exp ? new Date(payload.exp * 1000).toISOString() : null
  });
}
module.exports = { routeJwt };
