// /otp — TOTP (RFC 6238) and HOTP (RFC 4226) generation/verification
const crypto = require('crypto');
const b32decode = (s) => {
  const a = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '', clean = s.toUpperCase().replace(/[^A-Z2-7]/g, '');
  for (const c of clean) bits += a.indexOf(c).toString(2).padStart(5, '0');
  let out = Buffer.alloc(Math.floor(bits.length / 8));
  for (let i = 0; i < out.length; i++) out[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  return out;
};
function hotp(key, counter, digits = 6, algo = 'sha1') {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac(algo, key).update(buf).digest();
  const off = h[h.length - 1] & 0xf;
  const code = ((h[off] & 0x7f) << 24 | h[off+1] << 16 | h[off+2] << 8 | h[off+3]) % 10 ** digits;
  return String(code).padStart(digits, '0');
}
function routeOtp(u, res, json) {
  const p = u.searchParams;
  const secret = (p.get('secret') || p.get('s') || '').trim();
  if (!secret) return json(res, 200, { usage: '?secret=BASE32KEY — generate TOTP. Extra: [&code=123456] to verify, [&period=30] [&digits=6] [&algorithm=sha1|sha256|sha512] [&counter=N] for HOTP' });
  let key;
  try { key = b32decode(secret); } catch { return json(res, 400, { error: 'invalid base32 secret' }); }
  if (!key.length) return json(res, 400, { error: 'empty secret after decode' });
  const digits = Math.min(Math.max(+(p.get('digits') || 6) || 6, 6), 8);
  const algo = (p.get('algorithm') || 'sha1').toLowerCase();
  if (!['sha1', 'sha256', 'sha512'].includes(algo)) return json(res, 400, { error: 'algorithm must be sha1, sha256, or sha512' });
  const now = Math.floor(Date.now() / 1000);
  const period = Math.min(Math.max(+(p.get('period') || 30) || 30, 1), 86400);
  if (p.get('counter') !== null) {
    const counter = BigInt(p.get('counter'));
    return json(res, 200, { type: 'HOTP', code: hotp(key, counter, digits, algo) });
  }
  const counter = Math.floor(now / period);
  const code = hotp(key, counter, digits, algo);
  const expiresIn = period - (now % period);
  if (p.get('code') !== null) {
    const given = p.get('code').replace(/\s/g, '');
    const prev = hotp(key, counter - 1, digits, algo);
    const next = hotp(key, counter + 1, digits, algo);
    const match = given === code, drift1 = given === prev || given === next;
    return json(res, 200, { valid: match, valid_within_drift_1: drift1, current_code: code, expires_in: expiresIn });
  }
  return json(res, 200, { type: 'TOTP', code, expires_in: expiresIn, period, digits, algorithm: algo, next_code: hotp(key, counter + 1, digits, algo) });
}
module.exports = { routeOtp };
