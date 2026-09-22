// Password utilities: /password?generate=1&length=20&symbols=0&count=5 — generate
// /password?strength=... or POST {strength} — analyze entropy/crack time
// /password?hash=...&algo=sha256 — hash (bcrypt-style algorithms not included)
const crypto = require('crypto');
function genPassword(length, useSymbols, noAmbiguous) {
  let upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ' + (noAmbiguous ? '' : 'IO');
  let lower = 'abcdefghijkmnpqrstuvwxyz' + (noAmbiguous ? '' : 'lo');
  let digits = '23456789' + (noAmbiguous ? '' : '01');
  let symbols = '!@#$%^&*()-_=+[]{};:,.<>?';
  const pool = upper + lower + digits + (useSymbols ? symbols : '');
  let out = '';
  const rnd = crypto.randomBytes(length * 2);
  let i = 0;
  while (out.length < length) {
    const b = rnd[i++];
    if (b / 255 < length / (length + 20)) { out += pool[b % pool.length]; }
    else out += pool[b % pool.length];
    if (i >= rnd.length) break;
  }
  return out.slice(0, length);
}
function analyze(pw) {
  const len = pw.length;
  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/[0-9]/.test(pw)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) pool += 33;
  const entropy = len * Math.log2(pool || 1);
  // guesses at 10^10/s (modern GPU)
  const seconds = Math.pow(2, entropy) / 1e10;
  const fmt = s => {
    if (s < 1) return 'instant';
    const units = [['year', 31557600], ['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1]];
    for (const [name, sec] of units) { if (s >= sec) { const v = s / sec; return v > 1e6 ? v.toExponential(2) + ' ' + name + 's' : v.toFixed(v < 10 ? 1 : 0) + ' ' + name + 's'; } }
  };
  let score = 0;
  if (entropy >= 28) score = 1;
  if (entropy >= 36) score = 2;
  if (entropy >= 60) score = 3;
  if (entropy >= 80) score = 4;
  if (entropy >= 100) score = 5;
  const feedback = [];
  if (len < 12) feedback.push('use at least 12 characters');
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw)) feedback.push('mix upper and lower case');
  if (!/[0-9]/.test(pw)) feedback.push('add digits');
  if (!/[^a-zA-Z0-9]/.test(pw)) feedback.push('add symbols');
  if (/(.)\1{2,}/.test(pw)) feedback.push('repeated characters detected');
  const common = ['password', '123456', 'qwerty', 'letmein', 'admin', 'welcome', 'iloveyou', 'dragon', 'monkey', 'abc123'];
  if (common.some(c => pw.toLowerCase().includes(c))) feedback.push('contains a common dictionary word');
  return { length: len, charsetPoolSize: pool, entropyBits: +entropy.toFixed(1), guesses: Math.pow(2, entropy), crackTimeAt10BperSec: fmt(seconds), score: score + '/5', feedback };
}
async function routePassword(u, res, json, body, method) {
  const aliasLength = u.searchParams.get('length');
  if (u.searchParams.get('generate') || aliasLength) {
    const length = Math.min(128, Math.max(4, +(u.searchParams.get('length') || 20)));
    const symbols = u.searchParams.get('symbols') !== '0';
    const noAmbiguous = u.searchParams.get('noambiguous') === '1';
    const count = Math.min(100, Math.max(1, +(u.searchParams.get('count') || 1)));
    const passwords = Array.from({ length: count }, () => genPassword(length, symbols, noAmbiguous));
    return json(res, 200, { passwords, length, symbols, count });
  }
  const strengthInput = u.searchParams.get('strength') ?? (method === 'POST' ? (() => { try { return JSON.parse(body || '{}').strength; } catch { return null; } })() : null);
  if (strengthInput) {
    return json(res, 200, { password: strengthInput, ...analyze(strengthInput) });
  }
  return json(res, 400, { error: 'provide ?generate=1[&length=&symbols=&count=] or ?strength=yourpassword' });
}
module.exports = { routePassword, genPassword, analyze };
