// TOTP/HOTP endpoint: /totp?secret=BASE32&mode=totp (default) — generate current code
// /totp?secret=...&code=123456 — verify a code (+/- window)
// /totp?secret=...&mode=hotp&counter=0 — HOTP generation
// /totp?generate=1 — make a new random secret
const crypto = require('crypto');
const b32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32Decode(s) {
  s = s.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '', out = [];
  for (const c of s) { const v = b32.indexOf(c); if (v < 0) continue; bits += v.toString(2).padStart(5, '0'); }
  for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(out);
}
function base32Encode(buf) {
  let bits = '', out = '';
  for (const b of buf) bits += b.toString(2).padStart(8, '0');
  for (let i = 0; i + 5 <= bits.length; i += 5) out += b32[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}
function hotp(secretBuf, counter, digits = 6) {
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter % 0x100000000, 4);
  const h = crypto.createHmac('sha1', secretBuf).update(buf).digest();
  const off = h[h.length - 1] & 0xf;
  const code = ((h[off] & 0x7f) << 24 | h[off + 1] << 16 | h[off + 2] << 8 | h[off + 3]) % 10 ** digits;
  return String(code).padStart(digits, '0');
}
async function routeTotp(u, res, json) {
  if (u.searchParams.get('generate')) {
    const secret = base32Encode(crypto.randomBytes(20));
    return json(res, 200, { secret, algorithm: 'SHA1', digits: 6, period: 30, otpauth: 'otpauth://totp/x?secret=' + secret });
  }
  const secret = u.searchParams.get('secret');
  if (!secret) return json(res, 400, { error: 'provide ?secret=BASE32 (or ?generate=1 to create one)' });
  let key;
  try { key = base32Decode(secret); if (!key.length) throw new Error(); } catch { return json(res, 400, { error: 'invalid base32 secret' }); }
  const mode = (u.searchParams.get('mode') || 'totp').toLowerCase();
  const digits = Math.min(10, Math.max(6, +(u.searchParams.get('digits') || 6)));
  const period = Math.max(1, +(u.searchParams.get('period') || 30));
  if (mode === 'hotp') {
    const counter = +(u.searchParams.get('counter') ?? 0);
    if (!Number.isInteger(counter) || counter < 0) return json(res, 400, { error: 'counter must be a non-negative integer' });
    return json(res, 200, { mode, code: hotp(key, counter, digits), counter, digits });
  }
  const t = Math.floor(Date.now() / 1000);
  const step = Math.floor(t / period);
  const code = hotp(key, step, digits);
  const verify = u.searchParams.get('code');
  if (verify) {
    const window = Math.max(0, Math.min(10, +(u.searchParams.get('window') || 1)));
    const matched = [];
    for (let w = -window; w <= window; w++) if (hotp(key, step + w, digits) === verify.trim()) matched.push(w);
    return json(res, 200, { valid: matched.length > 0, verified: matched.length > 0, windowOffsets: matched, period, digits, secondsRemaining: period - (t % period) });
  }
  return json(res, 200, { mode: 'totp', code, step, period, digits, secondsRemaining: period - (t % period), timestamp: t });
}
module.exports = { routeTotp, hotp, base32Decode, base32Encode };
