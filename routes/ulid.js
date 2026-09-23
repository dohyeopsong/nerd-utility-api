// /ulid — ULID generation and parsing (sortable, 128-bit identifiers)
const crypto = require('crypto');
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // no I L O U
function encode(buf) { // 16 bytes -> 26 chars
  let s = '';
  for (let i = 0; i < 26; i++) {
    let v = 0;
    const start = Math.floor((i * 128) / 26), bits = 5;
    for (let b = 0; b < bits; b++) {
      const bit = 127 - (start + b);
      const bitVal = (buf[15 - Math.floor(bit / 8)] >> (bit % 8)) & 1;
      v = (v << 1) | bitVal;
    }
    s += CROCKFORD[v];
  }
  return s;
}
function decodeTime(s) { let t = 0n; for (const c of s.slice(0, 10)) t = t * 32n + BigInt(CROCKFORD.indexOf(c)); return t; }
function routeUlid(u, res, json) {
  const p = u.searchParams;
  if (p.get('ulid')) {
    const s = p.get('ulid').toUpperCase().replace(/-/g, '');
    if (!/^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$/.test(s)) return json(res, 400, { error: 'ULID must be 26 Crockford base32 chars (no I L O U)' });
    const t = decodeTime(s);
    let r = 0n; for (const c of s.slice(10)) r = r * 32n + BigInt(CROCKFORD.indexOf(c));
    return json(res, 200, { ulid: s, timestamp_ms: Number(t), timestamp_iso: new Date(Number(t)).toISOString(), randomness_hex: r.toString(16).padStart(20, '0') });
  }
  const count = Math.min(Math.max(+(p.get('count') || p.get('n') || 1) || 1, 1), 100);
  const now = Date.now();
  const ulids = [];
  for (let i = 0; i < count; i++) {
    const buf = crypto.randomBytes(16);
    buf[0] = (now / 2 ** 40) & 0xff; buf[1] = (now / 2 ** 32) & 0xff; buf[2] = (now / 2 ** 24) & 0xff;
    buf[3] = (now / 2 ** 16) & 0xff; buf[4] = (now / 2 ** 8) & 0xff; buf[5] = now & 0xff;
    ulids.push(encode(buf));
  }
  return json(res, 200, { ulids, count, timestamp_ms: now, timestamp_iso: new Date(now).toISOString() });
}
module.exports = { routeUlid };
