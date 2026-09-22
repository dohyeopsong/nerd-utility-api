// /password — secure password generator + strength estimator
const crypto = require('crypto');

const SETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.<>?',
};
function routePassword(u, res, json) {
  const q = u.searchParams;
  // Mode 1: check strength of ?text=
  const check = q.get('text') || q.get('check') || q.get('password');
  if (check) {
    let pool = 0;
    if (/[a-z]/.test(check)) pool += 26;
    if (/[A-Z]/.test(check)) pool += 26;
    if (/\d/.test(check)) pool += 10;
    if (/[^a-zA-Z0-9]/.test(check)) pool += 28;
    const entropy = check.length * Math.log2(pool || 1);
    let strength = 'very weak', score = 0;
    if (entropy >= 100) { strength = 'very strong'; score = 5; }
    else if (entropy >= 75) { strength = 'strong'; score = 4; }
    else if (entropy >= 55) { strength = 'moderate'; score = 3; }
    else if (entropy >= 35) { strength = 'weak'; score = 2; }
    else score = 1;
    const common = ['password','123456','qwerty','letmein','admin','welcome','iloveyou','123456789'];
    const is_common = common.some(c => check.toLowerCase().includes(c));
    if (is_common && score > 2) { score = 1; }
    return json(res, 200, {
      length: check.length,
      entropy_bits: Math.round(entropy),
      strength, score,
      contains: { lowercase: /[a-z]/.test(check), uppercase: /[A-Z]/.test(check), digits: /\d/.test(check), symbols: /[^a-zA-Z0-9]/.test(check) },
      is_common_pattern: is_common,
      estimated_crack_time: entropy > 100 ? 'centuries' : entropy > 75 ? 'decades' : entropy > 55 ? 'years' : entropy > 35 ? 'days' : 'seconds',
    });
  }
  // Mode 2: generate
  const len = Math.min(Math.max(parseInt(q.get('length') || q.get('len') || '20', 10), 4), 128);
  const count = Math.min(Math.max(parseInt(q.get('count') || '1', 10), 1), 50);
  const sets = (q.get('sets') || 'lower,upper,digits,symbols').split(',').filter(s => SETS[s]);
  if (!sets.length) return json(res, 400, { error: 'sets must include lower/upper/digits/symbols', example: '/password?length=20&sets=lower,upper,digits' });
  const pool = sets.map(s => SETS[s]).join('');
  const gen = () => {
    const bytes = crypto.randomBytes(len * 2);
    let out = '';
    for (let i = 0; out.length < len && i < bytes.length; i++) {
      const c = pool[bytes[i] % pool.length];
      out += c;
    }
    return out;
  };
  const passwords = Array.from({ length: count }, gen);
  const entropy = Math.round(len * Math.log2(pool.length));
  return json(res, 200, {
    length: len,
    sets,
    entropy_bits: entropy,
    passwords: passwords,
  });
}
module.exports = { routePassword };
