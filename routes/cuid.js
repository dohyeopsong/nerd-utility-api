// CUID2-style generator: secure random, base36, collision-resistant, prefixed 'c'
const crypto = require('crypto');
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
function randomLetter() { return ALPHABET[crypto.randomInt(26)]; }
function randomId(len) {
  let s = 'c'; // c for collision-resistant
  for (let i = 1; i < len; i++) s += ALPHABET[crypto.randomInt(36)];
  return s;
}
function routeCuid(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  const count = Math.min(parseInt(q.count || '1', 10) || 1, 100);
  const length = Math.min(Math.max(parseInt(q.length || '24', 10) || 24, 8), 32);
  const ids = [];
  for (let i = 0; i < count; i++) ids.push(randomId(length));
  return json(res, 200, { length, count, ids });
}
module.exports = { routeCuid, randomId };
