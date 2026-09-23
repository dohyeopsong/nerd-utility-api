// /jwt — decode a JWT (base64url) and report header, payload, and expiry status
function b64u(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Buffer.from(s, 'base64').toString('utf8'); }
function routeJwt(u, res, json) {
  const p = u.searchParams;
  const t = p.get('token');
  if (!t) return json(res, 200, { usage: '?token=<jwt> — decode header & payload, check expiry' });
  const parts = t.split('.');
  if (parts.length !== 3) return json(res, 422, { error: 'Invalid JWT: expected 3 dot-separated segments (header.payload.signature)' });
  let header, payload;
  try { header = JSON.parse(b64u(parts[0])); payload = JSON.parse(b64u(parts[1])); }
  catch (e) { return json(res, 422, { error: 'Invalid JWT: segments are not valid base64url-encoded JSON' }); }
  const now = Math.floor(Date.now() / 1000);
  const out = { header, payload, signature_present: parts[2].length > 0 };
  if (payload.exp) {
    out.exp = new Date(payload.exp * 1000).toISOString();
    out.expired = now > payload.exp;
    out.expires_in_seconds = payload.exp - now;
  }
  if (payload.iat) out.issued_at = new Date(payload.iat * 1000).toISOString();
  if (payload.nbf) out.not_before = new Date(payload.nbf * 1000).toISOString();
  if (header.alg === 'none') out.warning = 'alg=none — token is unsigned and must not be trusted';
  return json(res, 200, out);
}
module.exports = { routeJwt };
