// /jwt — decode and inspect a JWT: header, payload, signature, expiry status
function b64urlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64').toString('utf8');
}
function routeJwt(u, res, json) {
  const q = Object.fromEntries(u.searchParams.entries());
  const token = (q.token || '').trim();
  if (!token) throw new Error('missing ?token=<jwt>');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error(`invalid JWT: expected 3 dot-separated segments, got ${parts.length}`);

  let header, payload;
  try { header = JSON.parse(b64urlDecode(parts[0])); }
  catch { throw new Error('invalid JWT: header segment is not valid base64url JSON'); }
  try { payload = JSON.parse(b64urlDecode(parts[1])); }
  catch { throw new Error('invalid JWT: payload segment is not valid base64url JSON'); }

  const now = Math.floor(Date.now() / 1000);
  let expiry = 'unknown';
  if (typeof payload.exp === 'number') {
    expiry = now >= payload.exp ? `expired ${now - payload.exp}s ago` : `valid for ${payload.exp - now}s more`;
  }
  const issues = [];
  if (header.alg === 'none') issues.push('unsigned token (alg=none)');
  if (typeof payload.exp === 'number' && now >= payload.exp) issues.push('token expired');
  if (typeof payload.nbf === 'number' && now < payload.nbf) issues.push('token not yet valid');
  if (typeof payload.iat === 'number' && payload.iat > now + 60) issues.push('iat is in the future');

  return json(res, 200, {
    header,
    payload,
    signature: parts[2],
    signatureBits: parts[2].length * 6,
    expiry,
    valid: issues.length === 0,
    issues,
    decodedAt: new Date().toISOString(),
  });
}
module.exports = { routeJwt };
