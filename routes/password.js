// /password — generate strong passwords and estimate strength of existing ones
const crypto = require('crypto');

const SETS = {
  lower: 'abcdefghijkmnopqrstuvwxyz',
  upper: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  digits: '23456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.?/',
  // unambiguous sets (no 0/O, 1/l/I)
};

function genPassword(length, opts) {
  const pool = []
    .concat(opts.lower ? SETS.lower.split('') : [])
    .concat(opts.upper ? SETS.upper.split('') : [])
    .concat(opts.digits ? SETS.digits.split('') : [])
    .concat(opts.symbols ? SETS.symbols.split('') : []);
  if (!pool.length) return null;
  const limit = 256 - (256 % pool.length);
  const bytes = crypto.randomBytes(length * 2);
  let pw = '', bi = 0;
  while (pw.length < length) {
    if (bi >= bytes.length) return null;
    const b = bytes[bi++];
    if (b >= limit) continue;
    pw += pool[b % pool.length];
  }
  // ensure each requested class appears (replace positions)
  const classes = [['lower', SETS.lower], ['upper', SETS.upper], ['digits', SETS.digits], ['symbols', SETS.symbols]];
  for (const [name, set] of classes) {
    if (opts[name]) {
      const idx = crypto.randomInt(0, pw.length);
      pw = pw.slice(0, idx) + set[crypto.randomInt(0, set.length)] + pw.slice(idx + 1);
    }
  }
  return pw;
}

function strength(pw) {
  if (!pw) return { score: 0, verdict: 'empty', entropy_bits: 0 };
  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/[0-9]/.test(pw)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) pool += 33;
  let entropy = pw.length * Math.log2(pool || 1);
  // penalize repeats/sequences
  let uniq = new Set(pw).size;
  if (uniq < pw.length) entropy *= (uniq / pw.length + 1) / 2;
  const verdict = entropy < 28 ? 'very weak' : entropy < 36 ? 'weak' : entropy < 60 ? 'fair' : entropy < 80 ? 'strong' : 'very strong';
  return { length: pw.length, charset_size: pool, entropy_bits: Math.round(entropy), score: Math.min(5, Math.floor(entropy / 20)), verdict };
}

function routePassword(u, res, json) {
  const p = u.searchParams;
  const check = p.get('check') || p.get('strength');
  if (check) return json(res, 200, { password_length: check.length, strength: strength(check) });
  const length = Math.max(4, Math.min(128, parseInt(p.get('length') || '16', 10) || 16));
  const count = Math.max(1, Math.min(20, parseInt(p.get('count') || '1', 10) || 1));
  const opts = {
    lower: p.get('lower') !== '0',
    upper: p.get('upper') !== '0',
    digits: p.get('digits') !== '0',
    symbols: p.has('symbols') ? p.get('symbols') !== '0' : true,
  };
  const pws = [];
  for (let i = 0; i < count; i++) { const w = genPassword(length, opts); if (w) pws.push(w); }
  if (!pws.length) return json(res, 400, { error: 'at least one character class must be enabled' });
  return json(res, 200, {
    count: pws.length, length,
    estimated_crack_time: strength(pws[0]).entropy_bits < 60 ? 'hours-days' : 'centuries+',
    password: count === 1 ? pws[0] : undefined,
    passwords: count > 1 ? pws : undefined,
  });
}
module.exports = { routePassword };
