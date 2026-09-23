// /ulid — generate ULIDs (Universally Unique Lexicographically Sortable Identifiers)
// 128-bit: 48-bit ms timestamp + 80-bit randomness, Crockford base32.
const crypto = require('crypto');
const ENC = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford, no I L O U

function encodeTime(ms, len) {
  let out = '';
  for (let i = len - 1; i >= 0; i--) { out = ENC[ms % 32] + out; ms = Math.floor(ms / 32); }
  return out;
}

function routeUlid(u, res, json) {
  const p = u.searchParams;
  const count = Math.max(1, Math.min(100, parseInt(p.get('count') || '1', 10) || 1));
  const gen = () => {
    const time = encodeTime(Date.now(), 10);
    const rnd = crypto.randomBytes(10);
    let rand = '';
    // 80 bits -> 16 base32 chars
    let carry = 0, carryBits = 0;
    const bytes = Array.from(rnd);
    const bits = [];
    for (const b of bytes) { for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1); }
    for (let c = 0; c < 16; c++) {
      let v = 0;
      for (let i = 0; i < 5; i++) v = (v << 1) | bits[c * 5 + i];
      rand += ENC[v];
    }
    return time + rand;
  };
  const ids = Array.from({ length: count }, gen);
  const out = { count };
  if (count === 1) out.ulid = ids[0]; else out.ulids = ids;
  // decode mode
  const decode = p.get('decode') || p.get('from');
  if (decode) {
    if (!/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(decode)) return json(res, 400, { error: 'invalid ULID: expected 26 Crockford base32 chars' });
    const d = decode.toUpperCase();
    let ms = 0;
    for (let i = 0; i < 10; i++) ms = ms * 32 + ENC.indexOf(d[i]);
    return json(res, 200, { ulid: decode, timestamp_ms: ms, timestamp_iso: new Date(ms).toISOString() });
  }
  out.note = 'sort by creation time; use ?decode=<ulid> to extract timestamp';
  return json(res, 200, out);
}
module.exports = { routeUlid };
