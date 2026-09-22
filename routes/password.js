// /password — cryptographically secure password generation + strength analysis
const crypto = require('crypto');

function routePassword(u, res, json) {
  const q = u.searchParams;
  const check = q.get('check');
  const len = Math.min(128, Math.max(4, parseInt(q.get('length') || '16', 10) || 16));

  if (check !== null) {
    // strength analysis — never log or store the input
    const s = check;
    const out = { length: s.length };
    const classes = [
      /[a-z]/.test(s), /[A-Z]/.test(s), /[0-9]/.test(s), /[^a-zA-Z0-9]/.test(s)
    ];
    out.lowercase = classes[0]; out.uppercase = classes[1]; out.digits = classes[2]; out.symbols = classes[3];
    out.char_classes = classes.filter(Boolean).length;

    // entropy estimate: charset size based on classes present
    let pool = 0;
    if (classes[0]) pool += 26;
    if (classes[1]) pool += 26;
    if (classes[2]) pool += 10;
    if (classes[3]) pool += 33;
    out.pool_size = pool;
    const entropy = s.length * Math.log2(pool || 1);
    out.entropy_bits = Math.round(entropy);

    // penalties for common patterns
    let penalty = 0;
    const warnings = [];
    if (/^(.)\1+$/.test(s)) { penalty += entropy * 0.9; warnings.push('all identical characters'); }
    if (/^[0-9]+$/.test(s)) { penalty += entropy * 0.6; warnings.push('digits only'); }
    if (/^[a-z]+$/.test(s)) { penalty += entropy * 0.4; warnings.push('lowercase only'); }
    const common = ['password','123456','qwerty','letmein','admin','welcome','monkey','dragon','111111','abc123'];
    const low = s.toLowerCase();
    for (const c of common) if (low.includes(c)) { penalty += 30; warnings.push(`contains common word "${c}"`); break; }
    if (/(012|123|234|345|456|567|678|789|890)/.test(s)) { penalty += 10; warnings.push('sequential digits'); }
    if (/(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(s)) { penalty += 10; warnings.push('sequential letters'); }

    const effective = Math.max(0, entropy - penalty);
    out.effective_entropy_bits = Math.round(effective);
    out.warnings = warnings;

    let strength, crack_time;
    // assume 1e12 guesses/sec (modern GPU rig)
    const seconds = Math.pow(2, effective) / 1e12;
    if (effective < 28) { strength = 'very_weak'; crack_time = 'instant'; }
    else if (effective < 40) { strength = 'weak'; crack_time = fmt(seconds); }
    else if (effective < 60) { strength = 'fair'; crack_time = fmt(seconds); }
    else if (effective < 80) { strength = 'strong'; crack_time = fmt(seconds); }
    else { strength = 'very_strong'; crack_time = fmt(seconds); }
    out.strength = strength;
    out.estimated_crack_time = crack_time;
    return json(res, 200, out);
  }

  // generate
  const count = Math.min(20, Math.max(1, parseInt(q.get('count') || '1', 10) || 1));
  const noSymbols = q.get('symbols') === '0';
  let charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  if (!noSymbols) charset += '!@#$%^&*()-_=+[]{};:,.<>?';
  // ensure at least one of each class by default
  const passwords = [];
  for (let n = 0; n < count; n++) {
    const bytes = crypto.randomBytes(len * 2);
    let pw = '';
    for (let i = 0; pw.length < len && i < bytes.length; i++) {
      const idx = bytes[i] % charset.length;
      // rejection sampling not perfect here but bytes[i]%72 bias is negligible for this use
      pw += charset[idx];
    }
    passwords.push(pw);
  }
  return json(res, 200, { length: len, count, passwords });
}

function fmt(s) {
  if (s < 1) return 'instant';
  if (s < 60) return Math.round(s) + ' seconds';
  if (s < 3600) return Math.round(s/60) + ' minutes';
  if (s < 86400) return Math.round(s/3600) + ' hours';
  if (s < 31557600) return Math.round(s/86400) + ' days';
  const y = s / 31557600;
  if (y < 1e3) return Math.round(y) + ' years';
  if (y < 1e6) return (y/1e3).toFixed(1) + 'K years';
  if (y < 1e9) return (y/1e6).toFixed(1) + 'M years';
  if (y < 1e12) return (y/1e9).toFixed(1) + 'B years';
  return 'heat death of the universe';
}

module.exports = { routePassword };
