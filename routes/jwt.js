// /jwt — JWT decode (all algorithms) + verify HS256
const crypto = require('crypto');

function b64urlUnescape(s) { return s + '='.repeat((4 - s.length % 4) % 4); }
function b64urlDecode(s) { return Buffer.from(b64urlUnescape(s), 'base64').toString('utf8'); }

function decodeJWT(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('expected 3 dot-separated parts');
  const header = JSON.parse(b64urlDecode(parts[0]));
  const payload = JSON.parse(b64urlDecode(parts[1]));
  return { header, payload, signature: parts[2], signed: parts[0] + '.' + parts[1] };
}

function routeJwt(u, res, json) {
  const p = u.searchParams;
  const token = p.get('token') || p.get('q');
  if (!token) return json(res, 400, { error: 'provide ?token=<jwt> and optional ?secret=<hs256 key>' });
  try {
    const { header, payload, signature, signed } = decodeJWT(token.trim());
    const result = { header, payload };
    if (payload.exp) {
      result.expired = Math.floor(Date.now() / 1000) > payload.exp;
      result.expiresAt = new Date(payload.exp * 1000).toISOString();
    }
    if (payload.iat) result.issuedAt = new Date(payload.iat * 1000).toISOString();
    const secret = p.get('secret');
    if (secret) {
      if (header.alg !== 'HS256') {
        result.verifyError = `unsupported alg ${header.alg} (only HS256 supported)`;
      } else {
        // HMAC the raw "header.payload" string directly (utf8) — no Buffer concat games.
        const expected = crypto.createHmac('sha256', secret)
          .update(signed).digest('base64')
          .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        result.signatureValid = expected === signature;
      }
    } else if (header.alg === 'none') {
      result.warning = 'unsecured JWT (alg=none)';
    }
    return json(res, 200, result);
  } catch (e) {
    return json(res, 400, { error: 'invalid JWT: ' + e.message });
  }
}

module.exports = { routeJwt, decodeJWT };
