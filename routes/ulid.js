// /ulid — ULID generation and parsing (sortable, 128-bit identifiers)
const crypto = require('crypto');
const C = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32, no I L O U
function routeUlid(u, res, json) {
  const p = u.searchParams;
  if (p.get('ulid')) {
    const s = p.get('ulid').toUpperCase().replace(/-/g, '');
    if (!/^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$/.test(s)) return json(res, 400, { error: 'ULID must be 26 Crockford base32 chars (no I L O U)' });
    let t = 0n; for (const c of s.slice(0, 10)) t = t * 32n + BigInt(C.indexOf(c));
    let r = 0n; for (const c of s.slice(10)) r = r * 32n + BigInt(C.indexOf(c));
    return json(res, 200, { ulid: s, timestamp_ms: Number(t), timestamp_iso: new Date(Number(t)).toISOString(), randomness_hex: r.toString(16).padStart(20, '0') });
  }
  const count = Math.min(Math.max(+(p.get('count') || p.get('n') || 1) || 1, 1), 100);
  const now = Date.now();
  const ulids = [];
  for (let i = 0; i < count; i++) {
    // time part: 48-bit ms -> 10 chars (50 bits, top 2 are zero)
    let ts = '';
    for (let k = 9; k >= 0; k--) ts = C[(now / 2 ** (5 * k)) % 32] + ts;
    // randomness: 80 bits from crypto -> 16 chars
    let r = crypto.randomBytes(10).reduce((a, b) => (a << 8n) | BigInt(b), 0n);
    let rs = '';
    for (let k = 0; k < 16; k++) { rs = C[Number(r % 32n)] + rs; r /= 32n; }
    ulids.push(ts + rs);
  }
  return json(res, 200, { ulids, count, timestamp_ms: now, timestamp_iso: new Date(now).toISOString() });
}
module.exports = { routeUlid };
