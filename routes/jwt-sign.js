// JWT HS256 signer + decoder — node:crypto only, zero deps
const crypto = require('crypto');
const b64u = b => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const b64u_dec = s => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
function sign(payload, secret, { expSecs = 3600, alg = 'HS256' } = {}) {
  if (typeof payload !== 'object' || !payload) throw new Error('payload must be an object');
  const body = { iat: Math.floor(Date.now() / 1000), ...payload };
  if (expSecs > 0) body.exp = body.iat + Math.floor(expSecs);
  const header = { alg, typ: 'JWT' };
  const h = b64u(JSON.stringify(header)), p = b64u(JSON.stringify(body));
  const sig = b64u(crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest());
  return { token: `${h}.${p}.${sig}`, header, payload: body };
}
function verify(token, secret) {
  const parts = String(token).split('.');
  if (parts.length !== 3) return { valid: false, error: 'malformed' };
  const [h, p, s] = parts;
  const expect = b64u(crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest());
  const a = Buffer.from(s), b = Buffer.from(expect);
  const sig_ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  const payload = JSON.parse(b64u_dec(p).toString());
  const exp_ok = !payload.exp || payload.exp > Math.floor(Date.now() / 1000);
  return { valid: sig_ok && exp_ok, signature_ok: sig_ok, expired: payload.exp ? payload.exp <= Math.floor(Date.now() / 1000) : null, payload };
}
module.exports = { sign, verify };
