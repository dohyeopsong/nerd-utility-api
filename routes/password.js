// /password — cryptographically secure password generator + strength analysis
const crypto = require('crypto');

function routePassword(u, res, json) {
  const q = u.searchParams;

  // Analyze mode
  const check = q.get('check');
  if (check) return json(res, 200, analyze(check));

  // Generate mode
  let len = parseInt(q.get('length') || '16', 10);
  if (isNaN(len) || len < 4 || len > 128)
    return json(res, 400, { error: 'length must be 4-128' });
  const sets = [];
  if (q.get('symbols') !== 'false') sets.push("!@#$%^&*()-_=+[]{};:,.<>?");
  if (q.get('digits') !== 'false') sets.push("0123456789");
  if (q.get('lower') !== 'false') sets.push("abcdefghijklmnopqrstuvwxyz");
  if (q.get('upper') !== 'false') sets.push("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  if (q.get('ambiguous') === 'false') {
    // remove lookalikes: 0O1lI|`'";:
    for (let i = 0; i < sets.length; i++)
      sets[i] = sets[i].replace(/[0O1lI|`'";:]/g, '');
  }
  const pool = sets.join('');
  if (!pool.length) return json(res, 400, { error: 'all character sets disabled' });

  const count = Math.min(parseInt(q.get('count') || '1', 10) || 1, 50);
  const passwords = [];
  for (let i = 0; i < count; i++) {
    const bytes = crypto.randomBytes(len);
    let pw = '';
    for (let j = 0; j < len; j++) pw += pool[bytes[j] % pool.length];
    // ensure at least one char from each requested set
    if (sets.length > 1 && len >= sets.length) {
      let ok = sets.every(s => s.split('').some(c => pw.includes(c)));
      if (!ok) { i--; continue; } // regenerate
    }
    passwords.push(pw);
  }
  return json(res, 200, {
    passwords, length: len, count,
    entropy_bits: Math.round(len * Math.log2(pool.length) * 10) / 10,
    pool_size: pool.length,
  });
}

function analyze(pw) {
  const pool = new Set(pw).size;
  const entropy = Math.round(pw.length * Math.log2(pool || 1) * 10) / 10;
  const common = ['password', '123456', 'qwerty', 'letmein', 'admin', 'welcome',
    'iloveyou', 'monkey', 'dragon', 'abc123', 'password1', '12345678'];
  const lower = pw.toLowerCase();
  let weak = common.some(c => lower.includes(c));
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter(r => r.test(pw)).length;
  let strength, note;
  if (weak || entropy < 28) { strength = 'very-weak'; note = 'contains common password pattern or too little entropy'; }
  else if (entropy < 36) { strength = 'weak';
    note = 'brute-forceable offline in hours'; }
  else if (entropy < 60) { strength = 'fair'; note = 'ok for low-stakes accounts'; }
  else if (entropy < 100) { strength = 'strong'; note = 'resistant to offline attacks'; }
  else { strength = 'very-strong'; note = 'excellent'; }
  return {
    length: pw.length, distinct_chars: pool, entropy_bits: entropy,
    character_variety: variety, strength, note,
    contains_common_pattern: weak,
  };
}

module.exports = { routePassword };
