// UUID v7 generator/parser + v4 fallback — node:crypto only
const crypto = require('crypto');
function uuidv7(t = Date.now()) {
  const ts = BigInt(t);
  const b = crypto.randomBytes(16);
  // 48-bit unix ms | ver 7 | 12 rand | var 10 | 62 rand
  const buf = Buffer.alloc(16);
  buf.writeUInt32BE(Number(ts >> 16n), 0);
  buf.writeUInt16BE(Number(ts & 0xffffn), 4);
  buf[6] = 0x70 | (b[6] & 0x0f);            // version 7
  buf[7] = b[7];
  buf[8] = 0x80 | (b[8] & 0x3f);            // variant 10
  b.copy(buf, 9, 9);
  const hex = buf.toString('hex');
  return [hex.slice(0,8), hex.slice(8,12), hex.slice(12,16), hex.slice(16,20), hex.slice(20)].join('-');
}
function parse(id) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return { valid: false, error: 'malformed' };
  const hex = id.replace(/-/g, '');
  const ver = parseInt(hex[12], 16), varb = parseInt(hex[16], 16);
  const out = { valid: true, version: ver, variant: varb >> 2 === 0b10 ? 'RFC 4122' : 'other' };
  if (ver === 7) {
    const ts = BigInt('0x' + hex.slice(0, 12));
    out.timestamp_ms = Number(ts);
    out.generated_at = new Date(Number(ts)).toISOString();
  }
  if (ver === 1) out.note = 'time-based (MAC)';
  if (ver === 4) out.note = 'random';
  return out;
}
function sortKey(id) { return id.replace(/-/g, ''); }
async function routeUuid7(u, res, json) {
  const q = u.searchParams;
  if (q.get('parse')) return json(res, 200, parse(q.get('parse')));
  const n = Math.min(100, Math.max(1, +q.get('count') || 1));
  const ids = Array.from({ length: n }, () => uuidv7());
  json(res, 200, n === 1 && !q.get('count') ? { uuid: ids[0], ...parse(ids[0]) } : { uuids: ids, count: n });
}
module.exports = { routeUuid7, uuidv7, parse };
