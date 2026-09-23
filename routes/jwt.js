// /jwt — decode and inspect a JWT (header, payload, expiry status). No verification of signature.
function b64urlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64').toString('utf8');
}

function routeJwt(u, res, json, body, isPost) {
  let payload = null;
  if (typeof body === 'string' && body.trim()) { try { payload = JSON.parse(body); } catch { payload = null; } }
  else if (body && typeof body === 'object') payload = body;
  const token = (payload && payload.token) || u.searchParams.get('token');
  if (!isPost && !token) {
    return json(res, 200, {
      op: 'jwt',
      description: 'Decode a JWT: header, payload, and expiry status. Signature is NOT verified.',
      usage: 'POST /jwt {"token":"eyJ..."} or GET /jwt?token=eyJ...',
    });
  }
  if (!token || typeof token !== 'string') return json(res, 400, { error: 'Provide "token"' });
  const parts = token.trim().split('.');
  if (parts.length !== 3) return json(res, 400, { error: 'JWT must have 3 dot-separated parts (header.payload.signature)' });
  let header, claims;
  try { header = JSON.parse(b64urlDecode(parts[0])); }
  catch { return json(res, 400, { error: 'Invalid header segment (not base64url JSON)' }); }
  try { claims = JSON.parse(b64urlDecode(parts[1])); }
  catch { return json(res, 400, { error: 'Invalid payload segment (not base64url JSON)' }); }
  const now = Math.floor(Date.now() / 1000);
  const expiry = {};
  if (claims.exp !== undefined) {
    expiry.expiresAt = new Date(claims.exp * 1000).toISOString();
    expiry.expired = now > claims.exp;
    expiry.secondsRemaining = claims.exp - now;
  }
  if (claims.iat !== undefined) expiry.issuedAt = new Date(claims.iat * 1000).toISOString();
  if (claims.nbf !== undefined) expiry.notBefore = new Date(claims.nbf * 1000).toISOString();
  return json(res, 200, { header, claims, expiry, note: 'signature not verified' });
}

module.exports = { routeJwt };
