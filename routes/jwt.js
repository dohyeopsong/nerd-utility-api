// JWT decoder: parse header + payload (no signature verification — validation of structure/exp only)
function b64urlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64').toString('utf8');
}
function decode(token) {
  const t = String(token || '').trim();
  const parts = t.split('.');
  if (parts.length < 2 || parts.length > 3) return { error: 'JWT must have 2 or 3 dot-separated segments (header.payload.signature)' };
  let header, payload;
  try {
    header = JSON.parse(b64urlDecode(parts[0]));
    payload = JSON.parse(b64urlDecode(parts[1]));
  } catch (e) {
    return { error: 'segments are not valid base64url-encoded JSON' };
  }
  if (!header.alg || !header.typ) return { error: 'missing required header fields (alg, typ)' };
  const out = {
    header, payload,
    signature: parts[2] ? parts[2] : null,
    signaturePresent: !!parts[2],
    note: 'structure/exp decoded only; signature NOT cryptographically verified'
  };
  if (payload.exp) {
    const exp = new Date(payload.exp * 1000);
    out.expiresAt = exp.toISOString();
    out.expired = Date.now() > payload.exp * 1000;
  }
  if (payload.iat) out.issuedAt = new Date(payload.iat * 1000).toISOString();
  if (payload.nbf) out.notBefore = new Date(payload.nbf * 1000).toISOString();
  return out;
}
function routeJwt(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  if (!q.token) return json(res, 400, { error: 'missing ?token= JWT' });
  return json(res, 200, decode(q.token));
}
module.exports = { routeJwt, decode };
