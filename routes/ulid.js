// ULID generator: 48-bit timestamp + 80-bit randomness, Crockford base32, sortable
const crypto = require('crypto');
const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32
function encodeTime(now, len) {
  let mod, str = '';
  for (let i = len - 1; i >= 0; i--) { mod = now % 32; str = ENCODING[mod] + str; now = (now - mod) / 32; }
  return str;
}
function encodeRandom(len) {
  const bytes = crypto.randomBytes(len);
  let str = '';
  for (let i = 0; i < len; i++) str += ENCODING[bytes[i] % 32];
  return str;
}
function ulid(ts) { return encodeTime(ts || Date.now(), 10) + encodeRandom(16); }
function routeUlid(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  const count = Math.min(parseInt(q.count || '1', 10) || 1, 100);
  const ts = q.timestamp ? new Date(q.timestamp).getTime() : Date.now();
  const ids = [];
  for (let i = 0; i < count; i++) ids.push(ulid(Number.isFinite(ts) ? ts : undefined));
  return json(res, 200, { count, timestamp: Number.isFinite(ts) ? ts : Date.now(), ids });
}
module.exports = { routeUlid, ulid };
