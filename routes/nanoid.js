// NanoID generator: URL-safe alphabet, crypto-secure, configurable length
const crypto = require('crypto');
const URL_ALPHABET = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrictG';
function nanoid(len = 21) {
  const bytes = crypto.randomBytes(len);
  let id = '';
  for (let i = 0; i < len; i++) id += URL_ALPHABET[bytes[i] % 64];
  return id;
}
function routeNanoid(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  const count = Math.min(parseInt(q.count || '1', 10) || 1, 100);
  const length = Math.min(Math.max(parseInt(q.length || '21', 10) || 21, 4), 64);
  const ids = [];
  for (let i = 0; i < count; i++) ids.push(nanoid(length));
  return json(res, 200, { length, count, ids });
}
module.exports = { routeNanoid, nanoid };
