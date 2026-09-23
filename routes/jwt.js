// /jwt — decode JWT, check expiry and signature algorithm (no verification of secret)
function b64uJson(seg) {
  const b = Buffer.from(seg.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  return JSON.parse(b.toString('utf8'));
}
function routeJwt(u, res, json) {
  const p = u.searchParams;
  const token = p.get('token') || p.get('jwt');
  if (!token) return json(res, 200, { usage: '?token=<jwt> — decodes header and payload, checks exp/nbf/iat. Does NOT verify signature.' });
  const parts = token.split('.');
  if (parts.length !== 3) return json(res, 400, { error: 'JWT must have 3 dot-separated segments' });
  let header, payload;
  try { header = b64uJson(parts[0]); payload = b64uJson(parts[1]); }
  catch (e) { return json(res, 400, { error: 'malformed base64/JSON segments: ' + e.message }); }
  const now = Math.floor(Date.now() / 1000);
  const exp = typeof payload.exp === 'number' ? payload.exp : null;
  const nbf = typeof payload.nbf === 'number' ? payload.nbf : null;
  const expired = exp !== null ? now >= exp : null;
  const notYetValid = nbf !== null ? now < nbf : null;
  return json(res, 200, {
    header,
    payload,
    signature_present: parts[2].length > 0,
    checks: {
      expired,
      not_yet_valid: notYetValid,
      expires_at: exp ? new Date(exp * 1000).toISOString() : null,
      issued_at: payload.iat ? new Date(payload.iat * 1000).toISOString() : null,
      not_before: nbf ? new Date(nbf * 1000).toISOString() : null,
    },
    note: 'signature not verified (requires issuer secret/public key)'
  });
}
module.exports = { routeJwt };
