// /password — generate secure random passwords + strength analysis
const crypto = require('crypto');
const SETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.<>?/',
};
function routePassword(u, res, json) {
  const q = Object.fromEntries(u.searchParams.entries());
  const check = q.check; // ?check=<password> — analyze instead of generate
  if (check) {
    const p = check;
    const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter(r => r.test(p)).length;
    const entropy = Math.round(p.length * Math.log2(
      (/[a-z]/.test(p) ? 26 : 0) + (/[A-Z]/.test(p) ? 26 : 0) +
      (/[0-9]/.test(p) ? 10 : 0) + (/[^a-zA-Z0-9]/.test(p) ? 26 : 0) || 1));
    const issues = [];
    if (p.length < 8) issues.push('shorter than 8 chars');
    if (classes < 3) issues.push('fewer than 3 character classes');
    if (/^(.)\1+$/.test(p)) issues.push('all identical characters');
    if (/^[0-9]+$/.test(p)) issues.push('digits only');
    if (/password|12345|qwerty|admin/i.test(p)) issues.push('contains common pattern');
    return json(res, 200, {
      length: p.length, classes, entropyBits: entropy,
      strength: entropy < 28 ? 'very weak' : entropy < 36 ? 'weak' : entropy < 60 ? 'fair' : entropy < 128 ? 'strong' : 'very strong',
      issues,
    });
  }
  const length = Math.min(Math.max(parseInt(q.length || q.len || '16', 10) || 16, 4), 128);
  const use = {
    lower: q.lower !== '0', upper: q.upper !== '0',
    digits: q.digits !== '0', symbols: q.symbols !== '0',
  };
  if (q.only) { // e.g. ?only=digits
    for (const k of Object.keys(use)) use[k] = false;
    for (const k of q.only.split(',')) if (SETS[k.trim()]) use[k.trim()] = true;
  }
  const active = Object.keys(use).filter(k => use[k]);
  if (!active.length) throw new Error('no character classes enabled');
  let pool = active.map(k => SETS[k]).join('');
  const count = parseInt(q.count || '1', 10) || 1;
  const passwords = [];
  for (let i = 0; i < Math.min(count, 20); i++) {
    // ensure at least one char from each active class
    let chars = active.map(k => {
      const s = SETS[k];
      return s[crypto.randomInt(s.length)];
    });
    while (chars.length < length) chars.push(pool[crypto.randomInt(pool.length)]);
    // Fisher-Yates shuffle
    for (let j = chars.length - 1; j > 0; j--) {
      const k2 = crypto.randomInt(j + 1);
      [chars[j], chars[k2]] = [chars[k2], chars[j]];
    }
    passwords.push(chars.slice(0, length).join(''));
  }
  const entropy = Math.round(length * Math.log2(pool.length));
  return json(res, 200, {
    passwords: passwords.length === 1 ? passwords[0] : passwords,
    length, classes: active, poolSize: pool.length,
    entropyBits: entropy,
    strength: entropy < 36 ? 'weak' : entropy < 60 ? 'fair' : entropy < 128 ? 'strong' : 'very strong',
  });
}
module.exports = { routePassword };
