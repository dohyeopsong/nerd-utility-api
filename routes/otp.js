// /otp — TOTP (RFC 6238) generation & verification; HOTP (RFC 4226)
const crypto = require('crypto');
function b32decode(s) {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  s = s.toUpperCase().replace(/=+$/g, '').replace(/\s/g, '');
  let bits = '', out = [];
  for (const c of s) {
    const i = A.indexOf(c);
    if (i < 0) throw new Error('invalid base32 char: ' + c);
    bits += i.toString(2).padStart(5, '0');
    while (bits.length >= 8) { out.push(parseInt(bits.slice(0, 8), 2)); bits = bits.slice(8); }
  }
  return Buffer.from(out);
}
function routeOtp(u, res, json) {
  const p = u.searchParams;
  const secret = p.get('secret') || '';
  const mode = p.get('mode') || 'totp';
  const code = (p.get('code') || '').replace(/\s/g, '');
  const digits = Math.min(Math.max(+(p.get('digits') || 6), 6), 8);
  const period = +(p.get('period') || 30);
  if (!secret) return json(res, 200, { usage: '?secret=BASE32KEY&mode=totp|hotp&counter=N — generate OTP; add &code=123456 to verify' });
  let key;
  try { key = b32decode(secret); } catch (e) { return json(res, 400, { error: 'invalid base32 secret: ' + e.message }); }
  const hotp = (counter) => {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(BigInt(counter));
    const h = crypto.createHmac('sha1', key).update(buf).digest();
    const o = h[h.length - 1] & 0xf;
    const v = ((h[o] & 0x7f) << 24 | h[o+1] << 16 | h[o+2] << 8 | h[o+3]) >>> 0;
    return String(v % 10 ** digits).padStart(digits, '0');
  };
  if (mode === 'hotp') {
    const counter = +(p.get('counter') || 0);
    const out = { mode: 'hotp', code: hotp(counter), counter, digits };
    if (code) out.match = code === out.code;
    return json(res, 200, out);
  }
  const t = Math.floor(Date.now() / 1000);
  const counter = Math.floor(t / period);
  const out = { mode: 'totp', code: hotp(counter), seconds_remaining: period - (t % period), period, digits };
  if (code) {
    // allow +/- 1 window drift
    out.match = [counter - 1, counter, counter + 1].some(c => hotp(c) === code);
  }
  return json(res, 200, out);
}
module.exports = { routeOtp };
