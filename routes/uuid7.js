// UUID v7: time-ordered (RFC 9562). Generate and parse.
function uuidv7(monotonicState) {
  const ts = Date.now();
  let bytes;
  if (monotonicState && monotonicState.ts === ts) {
    // same ms: increment 12-bit rand_a counter
    monotonicState.seq = (monotonicState.seq + 1) & 0xfff;
    if (monotonicState.seq === 0) throw new Error('sequence overflow within same millisecond');
  } else {
    monotonicState.ts = ts;
    monotonicState.seq = crypto.getRandomValues(new Uint8Array(2));
    monotonicState.seq = ((monotonicState.seq[0] << 8) | monotonicState.seq[1]) & 0xfff;
  }
  const b = crypto.getRandomValues(new Uint8Array(16));
  const ts48 = BigInt(ts) & 0xffffffffffffn;
  // unix_ts_ms (48 bits)
  b[0] = Number(ts48 >> 40n); b[1] = Number(ts48 >> 32n) & 0xff;
  b[2] = Number(ts48 >> 24n) & 0xff; b[3] = Number(ts48 >> 16n) & 0xff;
  b[4] = Number(ts48 >> 8n) & 0xff; b[5] = Number(ts48) & 0xff;
  // ver=7 (4 bits) + rand_a (12 bits = our counter)
  b[6] = 0x70 | ((monotonicState.seq >> 8) & 0x0f);
  b[7] = monotonicState.seq & 0xff;
  // var=10 + rand_b
  b[8] = 0x80 | (b[8] & 0x3f);
  const hex = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return [hex.slice(0,8), hex.slice(8,12), hex.slice(12,16), hex.slice(16,20), hex.slice(20)].join('-');
}
function parseUuidv7(s) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s))
    throw new Error('not a valid UUIDv7');
  const hex = s.replace(/-/g, '');
  const tsHex = hex.slice(0, 12);
  const ms = parseInt(tsHex, 16);
  const date = new Date(ms);
  return { version: 7, timestampMs: ms, iso: date.toISOString() };
}
function routeUuid7(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  const action = (q.action || q.a || 'generate').toLowerCase();
  try {
    if (action === 'generate' || action === 'g' || action === 'gen') {
      const count = Math.min(parseInt(q.count || q.n || '1', 10) || 1, 1000);
      const state = {};
      const uuids = Array.from({ length: count }, () => uuidv7(state));
      return json(res, 200, { count, uuids, version: 'v7', note: count > 1 ? 'monotonic within same ms' : undefined });
    }
    if (action === 'parse' || action === 'p') {
      if (!q.uuid && !q.value) return json(res, 400, { error: 'provide ?uuid=<v7> to parse' });
      return json(res, 200, parseUuidv7(q.uuid || q.value));
    }
    return json(res, 400, { error: `unknown action '${action}'`, available: ['generate', 'parse'] });
  } catch (e) {
    return json(res, 400, { error: e.message });
  }
}
module.exports = { routeUuid7, uuidv7, parseUuidv7 };
