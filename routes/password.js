// routes/password.js — password / random string generator
// GET /password?length=20&count=5&digits=1&symbols=1&exclude=abc&excludeSimilar=1

const crypto = require('crypto');

function routePassword(u, res, json) {
  const q = u.searchParams;
  const length = Math.min(256, Math.max(parseInt(q.get('length') || '20', 10) || 20, 1));
  const count = Math.min(50, Math.max(parseInt(q.get('count') || '1', 10) || 1, 1));
  let upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', lower = 'abcdefghijklmnopqrstuvwxyz', digits = '0123456789';
  let symbols = q.get('symbols') === '0' ? '' : '!@#$%^&*()-_=+[]{}<>?,.;:';
  if (q.get('digits') === '0') digits = '';
  if (q.get('upper') === '0') upper = '';
  if (q.get('lower') === '0') lower = '';
  let pool = upper + lower + digits + symbols;
  if (!pool) return json(res, 400, { error: 'at least one character class must be enabled' });
  const exclude = (q.get('exclude') || '').replace(/[\[\]]/g, '');
  if (exclude) pool = [...new Set(pool.split(''))].filter(c => !exclude.includes(c)).join('');
  if (q.get('excludeSimilar') === '1') pool = pool.replace(/[Il1O0o]/g, '');
  if (!pool) return json(res, 400, { error: 'exclusions removed all characters' });
  const out = [];
  for (let i = 0; i < count; i++) {
    const bytes = crypto.randomBytes(length * 2);
    let pw = '';
    let bi = 0;
    while (pw.length < length && bi < bytes.length) {
      // rejection sampling for unbiased uniformity
      const b = bytes[bi++];
      if (b < 256 - (256 % pool.length)) pw += pool[b % pool.length];
    }
    out.push(pw);
  }
  const entropy = +(length * Math.log2(pool.length)).toFixed(1);
  return json(res, 200, { passwords: out, length, poolSize: pool.length, entropyBits: entropy, strength: entropy > 100 ? 'very strong' : entropy > 70 ? 'strong' : entropy > 45 ? 'moderate' : 'weak' });
}
module.exports = { routePassword };
