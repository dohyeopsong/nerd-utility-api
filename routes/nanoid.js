// NanoID-style URL-safe unique ID generator
const crypto = require('crypto');
function nanoid(size = 21, alphabet = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict') {
  let id = '';
  while (id.length < size) {
    const bytes = crypto.randomBytes(size * 2);
    for (const b of bytes) {
      if (b < 256 - (256 % alphabet.length)) {
        id += alphabet[b % alphabet.length];
        if (id.length >= size) break;
      }
    }
  }
  return id;
}
function routeNanoid(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  const size = Math.min(Math.max(parseInt(q.size || '21', 10) || 21, 1), 256);
  const count = Math.min(Math.max(parseInt(q.count || '1', 10) || 1, 1), 1000);
  const ids = Array.from({length: count}, () => nanoid(size));
  return json(res, 200, { size, count, ids, unique: new Set(ids).size === count });
}
module.exports = { routeNanoid, nanoid };
