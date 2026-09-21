// JWT decoder: base64url decode header/payload, expiry check (no signature verification)
function b64urlDecode(s) {
  const b = Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  return JSON.parse(b.toString('utf8'));
}
function routeJwt(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  const token = q.jwt || q.token;
  if (!token) return json(res, 400, { error: 'provide ?jwt=<token>. Decodes only; does NOT verify signatures.' });
  const parts = String(token).split('.');
  if (parts.length < 2 || parts.length > 3) return json(res, 400, { error: 'malformed JWT: expected 3 dot-separated parts' });
  try {
    const header = b64urlDecode(parts[0]);
    const payload = b64urlDecode(parts[1]);
    const out = { header, payload, signaturePresent: !!parts[2] && parts[2].length > 0 };
    if (payload.exp) {
      out.expiresAt = new Date(payload.exp * 1000).toISOString();
      out.expired = Date.now() / 1000 > payload.exp;
    }
    if (payload.iat) out.issuedAt = new Date(payload.iat * 1000).toISOString();
    if (payload.nbf) out.notBefore = new Date(payload.nbf * 1000).toISOString();
    out.warning = 'Signature NOT verified. Do not trust claims without verification.';
    return json(res, 200, out);
  } catch (e) { return json(res, 400, { error: 'failed to decode: ' + e.message }); }
}
module.exports = { routeJwt, b64urlDecode };
