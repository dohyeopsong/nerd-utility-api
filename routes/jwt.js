// /jwt — decode JWT header/payload (no signature verification), check expiry
function b64urlToJson(s) {
  const b = Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  return JSON.parse(b.toString('utf8'));
}
function routeJwt(u, res, json) {
  const q = u.searchParams;
  const token = q.get('token') || '';
  if (!token) return json(res, 400, { error: 'token required' });
  const parts = token.split('.');
  if (parts.length !== 3) return json(res, 400, { error: 'JWT must have 3 dot-separated parts (header.payload.signature)' });
  try {
    const header = b64urlToJson(parts[0]);
    const payload = b64urlToJson(parts[1]);
    const out = { header, payload, signature: parts[2], algorithm: header.alg, signature_verified: false, note: 'signature not verified — decode only' };
    if (payload.exp !== undefined) {
      const expDate = new Date(payload.exp * 1000);
      out.expires_at = expDate.toISOString();
      out.expired = Date.now() / 1000 > payload.exp;
    }
    if (payload.iat !== undefined) out.issued_at = new Date(payload.iat * 1000).toISOString();
    if (payload.nbf !== undefined) out.not_before = new Date(payload.nbf * 1000).toISOString();
    return json(res, 200, out);
  } catch (e) {
    return json(res, 400, { error: 'failed to decode: ' + e.message });
  }
}
module.exports = { routeJwt };
