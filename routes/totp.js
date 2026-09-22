// /totp — RFC 6238 TOTP generator and validator (HMAC-SHA1, 6 digits, 30s period)
const crypto = require('crypto');
function base32Decode(s) {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  s = s.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0, val = 0, out = Buffer.alloc(Math.floor(s.length * 5 / 8));
  let oi = 0;
  for (const ch of s) {
    const idx = A.indexOf(ch);
    if (idx < 0) throw new Error('invalid base32 char: ' + ch);
    val = (val << 5) | idx; bits += 5;
    if (bits >= 8) { bits -= 8; out[oi++] = (val >>> bits) & 0xFF; }
  }
  return out.slice(0, oi);
}
function hotp(secret, counter, digits = 6) {
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const h = crypto.createHmac('sha1', secret).update(buf).digest();
  const off = h[h.length - 1] & 0x0F;
  const code = ((h[off] & 0x7F) << 24 | h[off + 1] << 16 | h[off + 2] << 8 | h[off + 3]) % Math.pow(10, digits);
  return String(code).padStart(digits, '0');
}
function routeTotp(u, res, json) {
  const q = u.searchParams;
  const secret = (q.get('secret') || '').replace(/\s+/g, '');
  if (!secret) return json(res, 400, { error: 'secret required (base32)' });
  let key;
  try { key = base32Decode(secret); } catch (e) { return json(res, 400, { error: e.message }); }
  if (key.length === 0) return json(res, 400, { error: 'empty secret' });
  const period = +(q.get('period') || 30);
  const digits = +(q.get('digits') || 6);
  const now = Math.floor(Date.now() / 1000);
  const counter = Math.floor(now / period);
  const code = hotp(key, counter, digits);
  const out = {
    secret, period, digits,
    time_remaining: period - (now % period),
    code
  };
  const expected = q.get('expected') || q.get('code');
  if (expected) {
    out.expected = expected;
    // accept previous/current/next step
    const cands = [counter - 1, counter, counter + 1].map(c => hotp(key, c, digits));
    out.match = cands.includes(String(expected));
  }
  return json(res, 200, out);
}
module.exports = { routeTotp };
