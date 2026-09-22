// /password — secure password generator + strength analyzer
const crypto = require('crypto');

function routePassword(u, res, json) {
  const q = u.searchParams;
  const check = q.get('check');

  // ---------- strength check mode ----------
  if (check !== null) {
    return json(res, 200, analyzeStrength(check));
  }

  // ---------- generate mode ----------
  const length = clamp(parseInt(q.get('length') || '20', 10), 4, 128);
  const count = clamp(parseInt(q.get('count') || '1', 10), 1, 100);

  const sets = {
    lower:   'abcdefghijkmnopqrstuvwxyz',          // no l
    upper:   'ABCDEFGHJKLMNPQRSTUVWXYZ',           // no I O
    digits:  '23456789',                            // no 0 1
    symbols: q.get('symbols') === 'none' ? '' : '!@#$%^&*-_=+?',
  };
  const use = {
    lower:   q.get('lower')   !== '0',
    upper:   q.get('upper')   !== '0',
    digits:  q.get('digits')  !== '0',
    symbols: q.get('symbols') !== '0',
  };
  const active = Object.keys(use).filter(k => use[k] && sets[k]);
  if (!active.length) return json(res, 400, { error: 'enable at least one character set' });

  const pool = active.map(k => sets[k]).join('');
  const passwords = [];
  for (let i = 0; i < count; i++) {
    // per-set guarantee: one char from each active set, rest from pool
    const chars = active.map(k => pick(sets[k]));
    while (chars.length < length) chars.push(pick(pool));
    // Fisher-Yates shuffle with crypto randomness
    for (let j = chars.length - 1; j > 0; j--) {
      const r = crypto.randomInt(j + 1);
      [chars[j], chars[r]] = [chars[r], chars[j]];
    }
    passwords.push(chars.slice(0, length).join(''));
  }

  const entropy = Math.round(length * Math.log2(pool.length) * 10) / 10;
  return json(res, 200, {
    passwords, count, length,
    charset: active,
    pool_size: pool.length,
    entropy_bits: entropy,
    strength: entropyBitsLabel(entropy)
  });
}

function pick(s) { return s[crypto.randomInt(s.length)]; }
function clamp(n, lo, hi) { return isNaN(n) ? lo : Math.max(lo, Math.min(hi, n)); }

function entropyBitsLabel(b) {
  if (b < 40) return 'very-weak';
  if (b < 60) return 'weak';
  if (b < 80) return 'moderate';
  if (b < 100) return 'strong';
  return 'very-strong';
}

function analyzeStrength(pw) {
  const distinct = new Set(pw).size;
  const bits = Math.round(pw.length * Math.log2(Math.max(distinct, 2)) * 10) / 10;
  const problems = [];
  const common = ['password', '123456', 'qwerty', 'letmein', 'admin', 'welcome', 'iloveyou', 'monkey', 'dragon', 'abc123'];
  const lower = pw.toLowerCase();
  if (common.some(c => lower.includes(c))) problems.push('contains common word/pattern');
  if (/^[a-zA-Z]+$/.test(pw)) problems.push('no digits or symbols');
  if (/^\d+$/.test(pw)) problems.push('digits only');
  if (pw.length < 8) problems.push('too short (<8)');
  if (/(.)\1{2,}/.test(pw)) problems.push('repeated character run');
  if (/(012|123|234|345|456|567|678|789|abc|bcd|cde|def)/i.test(pw)) problems.push('sequential pattern');

  return {
    length: pw.length,
    distinct_chars: distinct,
    entropy_bits: bits,
    strength: problems.length >= 2 ? 'very-weak' : entropyBitsLabel(bits),
    problems: problems.length ? problems : null
  };
}

module.exports = { routePassword };
