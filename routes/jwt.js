// /jwt — JWT decode and inspection (no signature verification)
function b64urlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64').toString('utf8');
}

function routeJwt(u, res, json) {
  const q = u.searchParams;
  const token = (q.get('token') || '').trim();

  if (!token) {
    return json(res, 400, {
      error: 'provide ?token=<jwt>',
      note: 'Decodes header and payload; reports expiry status. Does NOT verify signatures.',
      example: '/jwt?token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.abc'
    });
  }

  const parts = token.split('.');
  if (parts.length !== 3 || !parts[0] || !parts[1]) {
    return json(res, 200, { valid: false, reason: 'not a JWS compact token (expected 3 dot-separated parts)' });
  }

  let header, payload;
  try {
    header = JSON.parse(b64urlDecode(parts[0]));
    payload = JSON.parse(b64urlDecode(parts[1]));
  } catch (e) {
    return json(res, 200, { valid: false, reason: 'base64/JSON decode failed: ' + e.message });
  }

  const now = Math.floor(Date.now() / 1000);
  let expiry = { present: false };
  if (payload.exp !== undefined) {
    const expired = now >= payload.exp;
    expiry = {
      present: true,
      exp: payload.exp,
      exp_iso: new Date(payload.exp * 1000).toISOString(),
      expired,
      seconds_remaining: payload.exp - now
    };
  }
  let issued = null;
  if (payload.iat !== undefined) issued = { iat: payload.iat, iat_iso: new Date(payload.iat * 1000).toISOString() };
  let nbf = null;
  if (payload.nbf !== undefined) nbf = { nbf: payload.nbf, active: now >= payload.nbf };

  return json(res, 200, {
    valid: true,
    header,
    payload,
    signature: parts[2],
    alg: header.alg || null,
    expiry,
    issued,
    not_before: nbf,
    note: 'decoded only; signature NOT verified'
  });
}

module.exports = { routeJwt };
