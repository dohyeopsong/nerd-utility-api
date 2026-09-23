// /jwt — decode JWT (header/payload, exp check) + optional HS256 verify
const crypto = require('crypto');
function b64url_decode(s) { return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'); }
function routeJwt(u, res, json) {
  const p = u.searchParams;
  const token = p.get('token');
  if (!token) return json(res, 200, { usage: '?token=<jwt> (decode+exp check), add &secret=<key> to verify HS256 signature' });
  const parts = token.split('.');
  if (parts.length !== 3) return json(res, 400, { error: 'JWT must have 3 dot-separated parts' });
  const [h, pl, sig] = parts;
  let header, payload;
  try { header = JSON.parse(b64url_decode(h)); payload = JSON.parse(b64url_decode(pl)); }
  catch (e) { return json(res, 400, { error: 'invalid base64/JSON in token' }); }
  const out = { header, payload };
  // exp/nbf/iat checks (numeric-date claims)
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === 'number') { out.expired = now >= payload.exp; out.expires_at = new Date(payload.exp * 1000).toISOString(); }
  if (typeof payload.nbf === 'number') { out.not_yet_valid = now < payload.nbf; }
  const secret = p.get('secret');
  if (secret) {
    if (header.alg === 'HS256') {
      const expected = crypto.createHmac('sha256', secret).update(`${h}.${pl}`).digest('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
      out.signature_verified = sig === expected;
      if (!out.signature_verified) out.error = 'signature mismatch';
    } else {
      out.error = `unsupported alg for verify: ${header.alg} (only HS256 with shared secret)`;
    }
  }
  return json(res, 200, out);
}
module.exports = { routeJwt };
