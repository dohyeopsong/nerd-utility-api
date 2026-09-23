// /jwt — decode JWT, verify HS256 signature (given ?secret=), check exp/nbf/iat
const crypto = require('crypto');

function b64urlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64');
}
function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function routeJwt(u, res, json) {
  const token = u.searchParams.get('jwt') || u.searchParams.get('token') || u.searchParams.get('t');
  if (!token) return json(res, 400, { error: 'missing ?jwt=' });
  const secret = u.searchParams.get('secret');
  const parts = token.split('.');
  if (parts.length !== 3) return json(res, 400, { error: 'expected 3 dot-separated parts, got ' + parts.length });

  let header, payload, signature;
  try {
    header = JSON.parse(b64urlDecode(parts[0]).toString('utf8'));
    payload = JSON.parse(b64urlDecode(parts[1]).toString('utf8'));
    signature = b64urlDecode(parts[2]);
  } catch (e) { return json(res, 400, { error: 'malformed base64/JSON: ' + e.message }); }

  const out = { header, payload, alg: header.alg };

  // signature verification (HS256/HS384/HS512)
  if (secret) {
    const algMap = { HS256: 'sha256', HS384: 'sha384', HS512: 'sha512' };
    const hashAlg = algMap[header.alg];
    if (!hashAlg) {
      out.signatureVerified = null;
      out.note = 'cannot verify alg ' + header.alg + ' (only HS256/384/512 supported)';
    } else {
      const expected = crypto.createHmac(hashAlg, secret).update(parts[0] + '.' + parts[1]).digest();
      const sigValid = expected.length === signature.length && crypto.timingSafeEqual(expected, signature);
      out.signatureVerified = sigValid;
      if (!sigValid) out.reason = 'HMAC mismatch';
    }
  }

  // time-based claims (now in seconds)
  const now = Math.floor(Date.now() / 1000);
  const checks = {};
  if (typeof payload.exp === 'number') {
    checks.exp = { value: payload.exp, expired: now >= payload.exp, secondsRemaining: payload.exp - now };
  }
  if (typeof payload.nbf === 'number') checks.nbf = { value: payload.nbf, active: now >= payload.nbf };
  if (typeof payload.iat === 'number') checks.iat = { value: payload.iat, ageSeconds: now - payload.iat };
  if (Object.keys(checks).length) out.timeChecks = checks;
  if (checks.exp && checks.exp.expired) out.expired = true;

  return json(res, 200, out);
}

module.exports = { routeJwt };
