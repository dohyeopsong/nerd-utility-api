// /jwt — decode JWT headers and payloads, check expiry (no signature verification)
function routeJwt(u, res, json) {
  const q = u.searchParams;
  let token = q.get('jwt') || q.get('token') || '';
  if (!token) return json(res, 400, { error: 'jwt required' });
  token = token.replace(/^Bearer\s+/i, '').trim();
  const parts = token.split('.');
  if (parts.length !== 3) return json(res, 400, { error: 'expected 3 dot-separated segments, got ' + parts.length });
  let header, payload;
  try {
    header = JSON.parse(Buffer.from(b64url(parts[0]), 'base64'));
    payload = JSON.parse(Buffer.from(b64url(parts[1]), 'base64'));
  } catch (e) { return json(res, 400, { error: 'invalid base64/JSON segment: ' + e.message }); }
  const now = Math.floor(Date.now() / 1000);
  const out = { header, payload, iat: payload.iat, exp: payload.exp };
  if (payload.exp !== undefined) {
    const expired = now >= payload.exp;
    out.expired = expired;
    out.expires_in_seconds = payload.exp - now;
    out.expires_at = new Date(payload.exp * 1000).toISOString();
  } else out.expired = false, out.note = 'no exp claim';
  if (payload.iat !== undefined) out.issued_at = new Date(payload.iat * 1000).toISOString();
  if (payload.nbf !== undefined) { out.not_before = payload.nbf; out.not_yet_valid = now < payload.nbf; }
  out.signature_present = parts[2].length > 0;
  out.note_verification = 'signature NOT verified — decoding only';
  return json(res, 200, out);
}
function b64url(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return s;
}
module.exports = { routeJwt };
