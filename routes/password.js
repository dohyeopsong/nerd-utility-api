// /password — cryptographically secure password generation + strength analysis
const crypto = require('crypto');

const SETS = {
  lower: 'abcdefghijkmnopqrstuvwxyz',
  upper: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  digits: '23456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.<>?'
};

function secureRand(max) {
  // rejection-sampled unbiased random int in [0, max)
  const limit = Math.floor(256 / max) * max;
  let b;
  do { b = crypto.randomBytes(1)[0]; } while (b >= limit);
  return b % max;
}

function pick(set) { return set[secureRand(set.length)]; }

function generatePassword(opts) {
  const length = Math.min(128, Math.max(4, parseInt(opts.length, 10) || 16));
  const useAmbiguous = opts.ambiguous === '1';
  const classes = [];
  if (opts.lower !== '0') classes.push(useAmbiguous ? SETS.lower + 'l' : SETS.lower);
  if (opts.upper !== '0') classes.push(useAmbiguous ? SETS.upper + 'IO' : SETS.upper);
  if (opts.digits !== '0') classes.push(useAmbiguous ? SETS.digits + '01' : SETS.digits);
  if (opts.symbols !== '0') classes.push(SETS.symbols);
  if (!classes.length) classes.push(SETS.lower);

  const chars = [];
  const nClasses = Math.min(classes.length, length);
  for (let i = 0; i < nClasses; i++) chars.push(pick(classes[i]));
  const all = classes.join('');
  while (chars.length < length) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = secureRand(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

function analyzeStrength(pw) {
  let poolSize = 0;
  if (/[a-z]/.test(pw)) poolSize += 26;
  if (/[A-Z]/.test(pw)) poolSize += 26;
  if (/[0-9]/.test(pw)) poolSize += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) poolSize += 33;
  const entropy = pw.length * Math.log2(poolSize || 1);
  let strength, score;
  if (entropy < 28) { strength = 'very weak'; score = 0; }
  else if (entropy < 36) { strength = 'weak'; score = 1; }
  else if (entropy < 60) { strength = 'fair'; score = 2; }
  else if (entropy < 128) { strength = 'strong'; score = 3; }
  else { strength = 'very strong'; score = 4; }
  const warnings = [];
  if (/^[a-z]+$/.test(pw)) warnings.push('lowercase only');
  if (/^\d+$/.test(pw)) warnings.push('digits only');
  if (pw.length < 8) warnings.push('shorter than 8 chars');
  if (/^(.)\1+$/.test(pw)) warnings.push('all identical characters');
  if (/(012|123|234|345|456|567|678|789|abc|bcd|cde|qwe|asd|zxc)/i.test(pw)) warnings.push('contains a common sequence');
  return { length: pw.length, poolSize, entropyBits: Math.round(entropy * 10) / 10, strength, score, warnings };
}

function routePassword(u, res, json) {
  const p = {
    length: u.searchParams.get('length'),
    count: u.searchParams.get('count'),
    lower: u.searchParams.get('lower'),
    upper: u.searchParams.get('upper'),
    digits: u.searchParams.get('digits'),
    symbols: u.searchParams.get('symbols'),
    ambiguous: u.searchParams.get('ambiguous')
  };
  const analyze = u.searchParams.get('analyze');
  if (analyze !== null) {
    if (!analyze) return json(res, 400, { error: 'missing password value' });
    return json(res, 200, { password: analyze, ...analyzeStrength(analyze) });
  }
  const count = Math.min(50, Math.max(1, parseInt(u.searchParams.get('count'), 10) || 1));
  const length = Math.min(128, Math.max(4, parseInt(u.searchParams.get('length'), 10) || 16));
  const opts = { length, ambiguous: u.searchParams.get('ambiguous'), lower: u.searchParams.get('lower'), upper: u.searchParams.get('upper'), digits: u.searchParams.get('digits'), symbols: u.searchParams.get('symbols') };
  const passwords = [];
  for (let i = 0; i < count; i++) passwords.push(generatePassword(opts));
  return json(res, 200, { length, count, passwords, analysis: analyzeStrength(passwords[0]) });
}

module.exports = { routePassword, analyzeStrength, generatePassword };
