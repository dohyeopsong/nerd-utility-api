// /password — secure random password generation + strength analysis
const crypto = require('crypto');

function genPassword(length, sets) {
  const all = sets.join('');
  const bytes = crypto.randomBytes(length * 2);
  let pw = '';
  for (let i = 0; pw.length < length && i < bytes.length; i++) {
    const c = all[bytes[i] % all.length];
    pw += c;
  }
  // ensure at least one char from each set
  const extra = crypto.randomBytes(sets.length);
  sets.forEach((s, i) => { if (!s.split('').some(ch => pw.includes(ch))) pw = pw.slice(0, -1) + s[extra[i] % s.length]; });
  return pw.slice(0, length);
}

function analyze(pw) {
  const classes = [/[a-z]/.test(pw), /[A-Z]/.test(pw), /\d/.test(pw), /[^a-zA-Z0-9]/.test(pw)].filter(Boolean).length;
  let poolSize = 0;
  if (/[a-z]/.test(pw)) poolSize += 26;
  if (/[A-Z]/.test(pw)) poolSize += 26;
  if (/\d/.test(pw)) poolSize += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) poolSize += 33;
  const entropy = pw.length * Math.log2(poolSize || 1);
  // common patterns weaken
  const issues = [];
  if (/^(.)\1+$/.test(pw)) issues.push('all identical characters');
  if (/(.)\1{2,}/.test(pw)) issues.push('repeated character runs');
  if (/(012|123|234|345|456|567|678|789|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(pw)) issues.push('sequential characters');
  if (/^(password|qwerty|admin|letmein|welcome|monkey)/i.test(pw)) issues.push('common word base');
  const strength = entropy >= 100 ? 'very strong' : entropy >= 75 ? 'strong' : entropy >= 50 ? 'moderate' : 'weak';
  return { length: pw.length, charClasses: classes, entropyBits: Math.round(entropy), strength, issues };
}

function routePassword(u, res, json) {
  const q = Object.fromEntries(u.searchParams.entries());
  const LOWER = 'abcdefghijkmnopqrstuvwxyz', UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ', DIGITS = '23456789', SYMBOLS = '!@#$%^&*()-_=+[]{}<>?';
  if (q.check) return json(res, 200, { password: undefined, ...analyze(q.check), hint: 'not stored, not logged' });
  const length = Math.min(Math.max(Number(q.length) || 16, 4), 128);
  const sets = [];
  if (q.noLower !== '1') sets.push(LOWER);
  if (q.noUpper !== '1') sets.push(UPPER);
  if (q.noDigits !== '1') sets.push(DIGITS);
  if (q.symbols === '1') sets.push(SYMBOLS);
  if (!sets.length) sets.push(LOWER);
  const count = Math.min(Number(q.count) || 1, 50);
  const passwords = Array.from({ length: count }, () => genPassword(length, sets));
  return json(res, 200, { count, length, symbols: q.symbols === '1', passwords, ...analyze(passwords[0]) });
}

module.exports = { routePassword };
