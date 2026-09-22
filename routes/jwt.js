// /jwt — decode JWT payload and check expiry (no verification, informational)
function b64urlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64').toString('utf8');
}
function routeJwt(u, res, json) {
  const q = u.searchParams;
  const mode = (q.get('mode') || 'decode').toLowerCase();
  const token = q.get('token') || q.get('jwt') || q.get('t');
  if (!token) return json(res, 400, { error: 'token required' });
  const parts = token.split('.');
  if (parts.length < 2 || parts.length > 3) return json(res, 400, { error: 'malformed JWT (expected header.payload.signature)' });
  let header, payload;
  try {
    header = JSON.parse(b64urlDecode(parts[0]));
    payload = JSON.parse(b64urlDecode(parts[1]));
  } catch (e) {
    return json(res, 400, { error: 'invalid base64url or JSON: ' + e.message });
  }
  if (mode === 'decode') {
    return json(res, 200, {
      header, payload,
      signature: parts[2] ? parts[2] : null,
      note: 'decoded only; signature NOT verified'
    });
  }
  if (mode === 'check' || mode === 'expiry') {
    const now = Math.floor(Date.now() / 1000);
    const exp = payload.exp, nbf = payload.nbf, iat = payload.iat;
    let state = 'valid';
    if (exp !== undefined) {
      if (now >= exp) state = 'expired';
      else if (exp - now < 300) state = 'expiring soon';
    }
    if (nbf !== undefined && now < nbf && state !== 'expired') state = 'not yet valid';
    return json(res, 200, {
      header, payload,
      signature: parts[2] || null,
      state,
      now,
      exp: exp ?? null,
      expires_in_seconds: exp !== undefined ? exp - now : null,
      expired: exp !== undefined ? now >= exp : false,
      valid_range: iat || nbf || exp ? {
        iat: iat ?? null, nbf: nbf ?? null, exp: exp ?? null,
        iat_human: iat ? new Date(iat * 1000).toISOString() : null,
        exp_human: exp ? new Date(exp * 1000).toISOString() : null
      } : null
    });
  }
  return json(res, 400, { error: 'mode must be decode|check' });
}
module.exports = { routeJwt };
