// JWT inspector: decode header/payload, check time-based claims
function b64urlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64').toString('utf8');
}
function inspect(token) {
  if (!token || typeof token !== 'string') return { error: 'missing ?token= parameter' };
  const parts = token.split('.');
  if (parts.length < 2 || parts.length > 3) return { error: 'invalid JWT: expected header.payload.signature' };
  let header, payload;
  try { header = JSON.parse(b64urlDecode(parts[0])); } catch { return { error: 'invalid JWT header (not base64url JSON)' }; }
  try { payload = JSON.parse(b64urlDecode(parts[1])); } catch { return { error: 'invalid JWT payload (not base64url JSON)' }; }
  const now = Math.floor(Date.now() / 1000);
  const out = { header, payload, timeClaims: {}, warnings: [] };
  if (payload.exp != null) { out.timeClaims.expiresAt = new Date(payload.exp * 1000).toISOString(); out.timeClaims.expired = payload.exp < now; if (out.timeClaims.expired) out.warnings.push('token is expired'); }
  if (payload.nbf != null) { const ok = payload.nbf <= now; out.timeClaims.notBefore = new Date(payload.nbf * 1000).toISOString(); out.timeClaims.activeYet = ok; if (!ok) out.warnings.push('token not yet valid (nbf in future)'); }
  if (payload.iat != null) out.timeClaims.issuedAt = new Date(payload.iat * 1000).toISOString();
  out.structure = { segments: parts.length, signaturePresent: !!parts[2] };
  if (!parts[2]) out.warnings.push('missing signature (unsecured JWT)');
  if (header.alg === 'none') out.warnings.push('alg=none — unsecured token');
  out.verified = false; out.note = 'signature not cryptographically verified (inspect only)';
  return out;
}
function routeJwt(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  return json(res, 200, inspect(q.token));
}
module.exports = { routeJwt, inspect };
