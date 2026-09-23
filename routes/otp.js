// /otp — HOTP (RFC 4226) / TOTP (RFC 6238) generation & verification
const crypto = require('crypto');
function b32decode(s) {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of s.toUpperCase().replace(/=+$/,'')) {
    const i = A.indexOf(c);
    if (i < 0) throw new Error('invalid base32 char');
    bits += i.toString(2).padStart(5, '0');
  }
  const out = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i+8), 2));
  return Buffer.from(out);
}
function hotp(key, counter, digits = 6) {
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 2**32), 0);
  buf.writeUInt32BE(counter % 2**32, 4);
  const h = crypto.createHmac('sha1', key).update(buf).digest();
  const o = h[h.length-1] & 0xf;
  const code = ((h[o]&0x7f)<<24 | h[o+1]<<16 | h[o+2]<<8 | h[o+3]) % 10**digits;
  return code.toString().padStart(digits, '0');
}
function routeOtp(u, res, json) {
  const p = u.searchParams;
  try {
    const secret = p.get('secret');
    if (!secret) return json(res, 200, { usage: '?secret=JBSWY3DPEHPK3PXP&code=123456 (verify) or &counter=1 (HOTP) or no code (current TOTP)' });
    const key = b32decode(secret.replace(/\s/g,''));
    const digits = parseInt(p.get('digits')||6, 10);
    if (p.get('code') !== null) {
      const code = p.get('code').replace(/\s/g,'');
      const counter = Math.floor(Date.now()/30000);
      let match = false, counterUsed = null;
      for (let w = -1; w <= 1; w++) {
        if (hotp(key, counter + w, digits) === code) { match = true; counterUsed = counter + w; break; }
      }
      return json(res, 200, { verified: match, ...(match ? { counterUsed } : {}) });
    }
    if (p.get('counter') !== null) {
      const c = parseInt(p.get('counter'), 10);
      return json(res, 200, { type: 'HOTP', counter: c, code: hotp(key, c, digits) });
    }
    const counter = Math.floor(Date.now()/30000);
    return json(res, 200, { type: 'TOTP', period: 30, code: hotp(key, counter, digits), expiresIn: 30 - Math.floor((Date.now()%30000)/1000) });
  } catch (e) { return json(res, 400, { error: e.message }); }
}
module.exports = { routeOtp };
