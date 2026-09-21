// TOTP (RFC 6238) generator & validator — no deps, node:crypto only
const crypto = require('crypto');
function b32decode(s) {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  s = s.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  let bits = 0, val = 0, out = [];
  for (const c of s) {
    const i = A.indexOf(c);
    if (i < 0) throw new Error('invalid base32 char: ' + c);
    val = (val << 5) | i; bits += 5;
    if (bits >= 8) { out.push((val >>> (bits - 8)) & 0xff); bits -= 8; }
  }
  return Buffer.from(out);
}
function hotp(keyBuf, counter, digits) {
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const h = crypto.createHmac('sha1', keyBuf).update(buf).digest();
  const o = h[h.length - 1] & 0x0f;
  const code = ((h[o] & 0x7f) << 24 | h[o+1] << 16 | h[o+2] << 8 | h[o+3]) % 10 ** digits;
  return String(code).padStart(digits, '0');
}
function totp(secret, { period = 30, digits = 6, t = Date.now() } = {}) {
  const key = /^[A-Z2-7]+$/i.test(secret) && !/[^A-Za-z2-7]/.test(secret) ? b32decode(secret) : Buffer.from(secret, 'utf8');
  const counter = Math.floor(t / 1000 / period);
  return { code: hotp(key, counter, digits), period, expires_in: period - (Math.floor(t / 1000) % period), time_step: counter };
}
function verify(secret, code, { period = 30, digits = 6, window = 1, t = Date.now() } = {}) {
  if (!/^\d+$/.test(code)) return { valid: false, reason: 'code must be digits' };
  const key = b32decode(secret);
  const counter = Math.floor(t / 1000 / period);
  for (let w = -window; w <= window; w++) {
    if (hotp(key, counter + w, digits) === code) return { valid: true, matched_window: w };
  }
  return { valid: false };
}
async function routeTotp(u, res, json) {
  const q = u.searchParams;
  const secret = (q.get('secret') || '').replace(/\s/g, '');
  if (!secret) return json(res, 400, { error: 'secret required (base32)' });
  const opts = { period: +q.get('period') || 30, digits: +q.get('digits') || 6, t: q.get('t') ? +q.get('t') : Date.now() };
  try {
    if (q.get('code')) {
      const r = verify(secret, q.get('code'), opts);
      return json(res, 200, { secret: secret.slice(0, 4) + '…', code: q.get('code'), ...r });
    }
    const r = totp(secret, opts);
    return json(res, 200, { otpauth: `otpauth://totp/nerd:api?secret=${secret}&period=${opts.period}&digits=${opts.digits}`, ...r });
  } catch (e) { return json(res, 400, { error: e.message }); }
}
module.exports = { routeTotp, totp, verify };
