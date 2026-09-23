// /password — generate strong random passwords using crypto-secure randomness
const crypto = require('crypto');
function rand(n) { // unbiased random int < n
  const max = Math.floor(0xFFFFFFFF / n) * n;
  let x;
  do { x = crypto.randomBytes(4).readUInt32BE(0); } while (x >= max);
  return x % n;
}
function routePassword(u, res, json) {
  const p = u.searchParams;
  if (!p.get('generate') && !p.get('length') && !p.get('count')) return json(res, 200, { usage: '?length=20&count=3&symbols=1&exclude=abc — generate cryptographically secure passwords' });
  const length = Math.min(128, Math.max(4, parseInt(p.get('length') || '16', 10) || 16));
  const count = Math.min(20, Math.max(1, parseInt(p.get('count') || '1', 10) || 1));
  const symbols = p.get('symbols') !== '0';
  const exclude = new Set((p.get('exclude') || '').replace(/[^a-zA-Z0-9!@#$%^&*()\-_=+[\]{};:,.<>?/~]/g, '').split(''));
  let sets = ['abcdefghijkmnopqrstuvwxyz', 'ABCDEFGHJKLMNPQRSTUVWXYZ', '23456789'];
  if (symbols) sets.push('!@#$%^&*()-_=+[]{};:,.?/~');
  sets = sets.map(s => s.split('').filter(c => !exclude.has(c)).join('')).filter(s => s.length > 0);
  const pool = sets.join('');
  const out = { length, count, passwords: [] };
  for (let i = 0; i < count; i++) {
    let pw;
    do {
      pw = Array.from({ length }, () => pool[rand(pool.length)]).join('');
    } while (!sets.every(s => s.split('').some(c => pw.includes(c)))); // ensure one char per set
    out.passwords.push(pw);
  }
  out.entropy_bits = Math.round(length * Math.log2(pool.length));
  out.note = 'generated with crypto.randomBytes, rejection-sampled for uniformity';
  return json(res, 200, out);
}
module.exports = { routePassword };
