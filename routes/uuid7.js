// UUID v7 generator + parser: time-ordered UUIDs (RFC 9562)
const crypto = require('crypto');
function uuidv7() {
  const ts = Date.now();
  const b = crypto.randomBytes(16);
  b[0] = (ts / 2**40) & 0xff; b[1] = (ts / 2**32) & 0xff;
  b[2] = (ts / 2**24) & 0xff; b[3] = (ts / 2**16) & 0xff;
  b[4] = (ts / 2**8) & 0xff; b[5] = ts & 0xff;
  b[6] = (b[6] & 0x0f) | 0x70; // version 7
  b[8] = (b[8] & 0x3f) | 0x80; // variant
  const h = b.toString('hex');
  return [h.slice(0,8), h.slice(8,12), h.slice(12,16), h.slice(16,20), h.slice(20)].join('-');
}
function routeUuid7(u, res, json) {
  const count = Math.min(parseInt(u.searchParams.get('count') || '1', 10) || 1, 100);
  const parse = u.searchParams.get('parse');
  if (parse) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(parse)) {
      return json(res, 400, { error: 'not a valid UUIDv7' });
    }
    const hex = parse.replace(/-/g, '');
    const ms = Number('0x' + hex.slice(0, 12));
    return json(res, 200, {
      uuid: parse, version: 7,
      timestampMs: ms,
      timestamp: new Date(ms).toISOString()
    });
  }
  return json(res, 200, { uuids: Array.from({length: count}, uuidv7) });
}
module.exports = { routeUuid7 };
