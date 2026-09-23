// /jwt — decode and (optionally) verify JSON Web Tokens (JWS compact format)
const crypto = require('crypto');
const b64u = {
  encode: (buf) => buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_'),
  decode: (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64'),
};

function routeJwt(u, res, json) {
  const p = u.searchParams;
  const token = p.get('token') || p.get('jwt');
  if (!token) return json(res, 400, { error: 'provide ?token=<JWT> and optional ?secret= for HS256 verification' });
  const parts = token.split('.');
  if (parts.length !== 3) return json(res, 400, { error: 'malformed JWT: expected 3 dot-separated segments' });
  const [h, pl, sig] = parts;
  let header, payload;
  try {
    header = JSON.parse(b64u.decode(h).toString('utf8'));
    payload = JSON.parse(b64u.decode(pl).toString('utf8'));
  } catch (e) {
    return json(res, 400, { error: 'invalid base64/JSON segment: ' + e.message });
  }

  const out = {
    header,
    payload,
    alg: header.alg,
    typ: header.typ || null,
  };

  // timestamp claims
  const now = Math.floor(Date.now() / 1000);
  const time = {};
  if (typeof payload.exp === 'number') { time.exp = payload.exp; time.expired = payload.exp < now; time.seconds_remaining = payload.exp - now; }
  if (typeof payload.nbf === 'number') time.not_yet_valid = payload.nbf > now;
  if (typeof payload.iat === 'number') time.issued_at = payload.iat;
  out.time = Object.keys(time).length ? time : null;

  // verification (HS256/HS384/HS512 only)
  const secret = p.get('secret');
  if (secret) {
    const alg = header.alg || '';
    const map = { HS256: 'sha256', HS384: 'sha384', HS512: 'sha512' };
    if (!map[alg]) {
      out.signature_valid = null;
      out.note = 'verification only supported for HS256/HS384/HS512; alg is ' + alg;
    } else {
      const expected = crypto.createHmac(map[alg], secret).update(`${h}.${pl}`).digest();
      const actual = b64u.decode(sig);
      out.signature_valid = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
    }
  }
  return json(res, 200, out);
}
module.exports = { routeJwt };
