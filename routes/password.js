// Secure password generator + strength estimator — node:crypto only
const crypto = require('crypto');
const SETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.<>?/~',
};
const COMMON = ['password', '123456', 'qwerty', 'letmein', 'admin', 'welcome', 'iloveyou', 'monkey', 'dragon', 'abc123'];
function secureRand(max) { // unbiased random int < max
  const lim = 2 ** (8 * 4) - (2 ** (8 * 4) % max);
  let x;
  do { x = crypto.randomBytes(4).readUInt32BE(0); } while (x >= lim);
  return x % max;
}
function genPassword({ length = 16, lower = true, upper = true, digits = true, symbols = true, exclude = '' } = {}) {
  let pool = '';
  if (lower) pool += SETS.lower;
  if (upper) pool += SETS.upper;
  if (digits) pool += SETS.digits;
  if (symbols) pool += SETS.symbols;
  pool = [...pool].filter(c => !exclude.includes(c)).join('');
  if (!pool.length) throw new Error('empty charset');
  let pw = '';
  for (let i = 0; i < length; i++) pw += pool[secureRand(pool.length)];
  return { password: pw, entropy_bits: +(length * Math.log2(pool.length)).toFixed(1) };
}
function strength(pw) {
  const classes = [/a-z/, /A-Z/, /0-9/, /[^a-zA-Z0-9]/].filter(r => r.test(pw)).length;
  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/[0-9]/.test(pw)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) pool += 25;
  let entropy = pw.length * Math.log2(pool || 1);
  const lower = pw.toLowerCase();
  const commonHit = COMMON.find(c => lower.includes(c));
  if (commonHit) entropy = Math.min(entropy, 20);
  if (pw.length > 3) { // repeated char penalty
    const uniq = new Set(pw).size;
    if (uniq / pw.length < 0.5) entropy *= 0.6;
  }
  entropy = Math.round(entropy);
  const level = entropy < 28 ? 'very weak' : entropy < 36 ? 'weak' : entropy < 60 ? 'fair' : entropy < 128 ? 'strong' : 'very strong';
  return { length: pw.length, char_classes: classes, entropy_bits: entropy, strength: level, common_pattern: commonHit || null,
    crack_time_10ghps: entropy < 64 ? `${(2 ** entropy / 1e10 / 3.15e7).toExponential(2)} years` : 'centuries+' };
}
async function routePassword(u, res, json) {
  const q = u.searchParams;
  try {
    if (q.get('check')) return json(res, 200, { password: q.get('check').slice(0, 2) + '…', ...strength(q.get('check')) });
    const r = genPassword({
      length: Math.min(128, Math.max(4, +q.get('length') || 16)),
      lower: q.get('lower') !== '0', upper: q.get('upper') !== '0',
      digits: q.get('digits') !== '0', symbols: q.get('symbols') !== '0',
      exclude: q.get('exclude') || '',
    });
    return json(res, 200, { ...r, ...strength(r.password) });
  } catch (e) { return json(res, 400, { error: e.message }); }
}
module.exports = { routePassword, genPassword, strength };
