// /jwt — JWT decode, HS256 verify, exp/nbf checks
const crypto = require('crypto');

function b64urlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64');
}

function b64urlEncode(buf) {
  return Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function decodeJwt(token) {
  const parts = token.split('.');
  if (parts.length !== 3) return { error: 'JWT must have 3 dot-separated parts (header.payload.signature)' };
  let header, payload;
  try {
    header = JSON.parse(b64urlDecode(parts[0]).toString('utf8'));
    payload = JSON.parse(b64urlDecode(parts[1]).toString('utf8'));
  } catch (e) {
    return { error: 'failed to decode header/payload: ' + e.message };
  }
  return { header, payload, signature: parts[2] };
}

function verifyJwt(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) return { valid: false, error: 'malformed token' };
  let header;
  try { header = JSON.parse(b64urlDecode(parts[0]).toString('utf8')); }
  catch (e) { return { valid: false, error: 'bad header' }; }

  if (!header.alg) return { valid: false, error: 'missing alg' };
  if (header.alg === 'none') return { valid: false, error: 'alg "none" not allowed' };
  if (header.alg !== 'HS256') return { valid: false, error: 'only HS256 supported, got ' + header.alg };

  if (!secret) return { valid: false, error: 'missing ?secret= for verification' };

  const expected = b64urlEncode(crypto.createHmac('sha256', secret).update(parts[0] + '.' + parts[1]).digest());
  const sigOk = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts[2]));
  if (!sigOk) return { valid: false, error: 'signature mismatch' };

  let payload;
  try { payload = JSON.parse(b64urlDecode(parts[1]).toString('utf8')); }
  catch (e) { return { valid: false, error: 'bad payload' }; }

  const now = Math.floor(Date.now() / 1000);
  const claims = {};
  if (payload.exp !== undefined) claims.exp = { value: payload.exp, expired: now >= payload.exp };
  if (payload.nbf !== undefined) claims.nbf = { value: payload.nbf, notYetValid: now < payload.nbf };
  if (payload.iat !== undefined) claims.iat = payload.iat;

  const expired = claims.exp && claims.exp.expired;
  const notYet = claims.nbf && claims.nbf.notYetValid;

  return { valid: !expired && !notYet, header, payload, claims, expired: !!expired, notYetValid: !!notYet };
}

function routeJwt(u, res, json) {
  const p = u.searchParams;
  const token = p.get('token') || p.get('jwt');
  if (!token) return json(res, 400, { error: 'provide ?token=<jwt>' });
  const secret = p.get('secret');

  const d = decodeJwt(token);
  if (d.error) return json(res, 400, d);

  if (secret) {
    const v = verifyJwt(token, secret);
    return json(res, 200, { decoded: { header: d.header, payload: d.payload }, ...v });
  }
  return json(res, 200, { header: d.header, payload: d.payload, note: 'not verified — provide ?secret= to verify HS256 signature' });
}

module.exports = { routeJwt, decodeJwt, verifyJwt };
