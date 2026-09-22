// /password — cryptographically secure password generator + strength estimation
const crypto = require('crypto');
function routePassword(u, res, json) {
  const q = u.searchParams;
  const check = q.get('check');        // strength-check an existing password
  const mode = (q.get('mode') || 'alphanumeric').toLowerCase();
  const len = Math.min(Math.max(+(q.get('len') || q.get('length') || 16), 4), 128);
  const count = Math.min(Math.max(+(q.get('count') || 1), 1), 50);
  if (check !== null) {
    // entropy estimation
    let pool = 0;
    if (/[a-z]/.test(check)) pool += 26;
    if (/[A-Z]/.test(check)) pool += 26;
    if (/[0-9]/.test(check)) pool += 10;
    if (/[^a-zA-Z0-9]/.test(check)) pool += 33;
    const entropy = check.length * Math.log2(pool || 1);
    let weaknesses = [];
    if (check.length < 12) weaknesses.push('shorter than 12 chars');
    if (/^[a-zA-Z]+$/.test(check)) weaknesses.push('no digits or symbols');
    if (!/[a-z]/.test(check) || !/[A-Z]/.test(check)) weaknesses.push('mixed case not used');
    if (/(.)\1{2,}/.test(check)) weaknesses.push('repeated characters');
    if (/(012|123|234|345|456|567|678|789|abc|bcd|cde|qwe|asd|zxc)/i.test(check)) weaknesses.push('sequential pattern');
    const strength = entropy >= 100 ? 'very_strong' : entropy >= 75 ? 'strong' : entropy >= 50 ? 'moderate' : 'weak';
    return json(res, 200, {
      password: check, length: check.length,
      charset_pool: pool,
      entropy_bits: Math.round(entropy * 10) / 10,
      strength, weaknesses,
      crack_time_estimate: estimateCrack(entropy)
    });
  }
  const sets = {
    alphanumeric: 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789',
    full: 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*-_=+?',
    letters: 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ',
    digits: '23456789',
    hex: '0123456789abcdef',
    passphrase_words: null
  };
  const passwords = [];
  if (mode === 'passphrase') {
    const words = q.get('words') ? Math.min(Math.max(+q.get('words'), 3), 12) : 4;
    const WORDS = require('crypto');
    const dict = ['anchor','bright','canyon','delta','ember','falcon','granite','harbor','island','jupiter','kernel','lumen','meadow','nimbus','orbit','prism','quartz','ripple','summit','timber','umbra','vertex','willow','xenon','yonder','zephyr','amber','basalt','cobalt','dune'];
    for (let c = 0; c < count; c++) {
      const picks = [];
      for (let w = 0; w < words; w++) picks.push(dict[crypto.randomInt(dict.length)]);
      passwords.push(picks.join('-'));
    }
  } else {
    const set = sets[mode] || sets.alphanumeric;
    for (let c = 0; c < count; c++) {
      let pw = '';
      const bytes = crypto.randomBytes(len);
      for (let i = 0; i < len; i++) pw += set[bytes[i] % set.length];
      passwords.push(pw);
    }
  }
  return json(res, 200, { mode, length: len, count, passwords });
}
function estimateCrack(entropyBits) {
  // assume 10^12 guesses/sec offline attack
  const seconds = Math.pow(2, entropyBits) / 1e12;
  if (seconds < 1) return 'instant';
  const units = [['year', 31557600], ['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [name, s] of units) {
    if (seconds >= s) {
      const v = seconds / s;
      if (v > 1e12) return '> ' + v.toExponential(2) + ' ' + name + 's';
      return Math.round(v).toLocaleString() + ' ' + name + (v >= 2 ? 's' : '');
    }
  }
  return seconds.toFixed(1) + ' seconds';
}
module.exports = { routePassword };
