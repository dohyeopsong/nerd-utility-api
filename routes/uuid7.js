// UUID v7 generator and parser: time-ordered (48-bit unix ms + counter + random), per RFC 9562
const crypto = require('crypto');
let lastMs = 0, lastCounter = 0;
function uuidv7() {
  const ts = Date.now();
  let counter;
  if (ts === lastMs) {
    counter = ++lastCounter;
  } else {
    lastMs = ts;
    counter = (crypto.randomBytes(2).readUInt16BE(0) & 0x0fff) << 2; // 12-bit rand_a seed shifted left 2
    lastCounter = counter;
  }
  const b = crypto.randomBytes(16);
  b[0] = (ts / 2 ** 40) & 0xff; b[1] = (ts / 2 ** 32) & 0xff; b[2] = (ts / 2 ** 24) & 0xff; b[3] = (ts / 2 ** 16) & 0xff; b[4] = (ts / 2 ** 8) & 0xff; b[5] = ts & 0xff;
  b[6] = ((counter >> 8) & 0x0f) | 0x70; // version 7 + high counter nibble
  b[7] = counter & 0xff;
  b[8] = (b[8] & 0x3f) | 0x80; // variant 10
  const h = b.toString('hex');
  return [h.slice(0,8), h.slice(8,12), h.slice(12,16), h.slice(16,20), h.slice(20)].join('-');
}
function parseV7(s) {
  const m = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.exec(s);
  if (!m) return null;
  const h = s.replace(/-/g, '');
  const ms = parseInt(h.slice(0, 12), 16);
  return { version: 7, timestampMs: ms, timestamp: new Date(ms).toISOString(), variant: '10x' };
}
function routeUuid7(u, res, json) {
  const parse = u.searchParams.get('parse');
  if (parse) {
    const r = parseV7(parse.trim());
    if (!r) return json(res, 400, { error: 'not a valid UUID v7' });
    return json(res, 200, r);
  }
  const n = Math.min(parseInt(u.searchParams.get('count') || '1', 10) || 1, 1000);
  const ids = Array.from({ length: n }, uuidv7);
  return json(res, 200, n === 1 ? { uuid: ids[0] } : { count: n, uuids: ids });
}
module.exports = { routeUuid7, uuidv7, parseV7 };
