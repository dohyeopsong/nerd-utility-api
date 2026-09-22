// /password — password strength scoring (entropy estimate + heuristics + crack-time)
const COMMON = ['password','123456','12345678','qwerty','abc123','password1','111111','123456789','letmein','welcome','monkey','dragon','iloveyou','admin','login','princess','football','sunshine','master','shadow','superman','batman','trustno1'];

function routePassword(u, res, json) {
  const q = u.searchParams;
  const pw = q.get('check');
  if (!pw) return json(res, 400, { error: 'provide ?check=your-password (URL-encoded)', example: '/password?check=Tr0ub4dor%263' });

  const out = { length: pw.length };
  const lower = /[a-z]/.test(pw), upper = /[A-Z]/.test(pw), digit = /[0-9]/.test(pw);
  const special = /[^a-zA-Z0-9]/.test(pw);
  out.character_classes = { lower, upper, digit, special };
  out.class_count = [lower, upper, digit, special].filter(Boolean).length;

  // charset size estimate
  let charset = 0;
  if (lower) charset += 26;
  if (upper) charset += 26;
  if (digit) charset += 10;
  if (special) charset += 33;

  // pool entropy (upper bound)
  const poolEntropy = pw.length * Math.log2(charset || 1);

  // penalize patterns
  let entropy = poolEntropy;
  const penalties = {};
  const lowerPw = pw.toLowerCase();
  if (COMMON.includes(lowerPw)) { penalties.common_word = -30; entropy -= 30; }
  if (/(.)\1{2,}/.test(pw)) { penalties.repeated_chars = -10; entropy -= 10; }
  if (/(0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|qwer|asdf|zxcv)/i.test(pw)) { penalties.sequential = -10; entropy -= 10; }
  if (pw === lowerPw && pw === pw.toUpperCase()) { penalties.single_case = -3; entropy -= 3; }
  if (/^\d+$/.test(pw)) { penalties.digits_only = -8; entropy -= 8; }
  // common substitutions like a->4, e->3, o->0 count less
  if (/^[^aeiou]*[0-9@#!$]+[^aeiou]*$/i.test(pw.replace(/[aeiou]/gi, ''))) { /* minor */ }

  out.estimated_entropy_bits = Math.max(0, Math.round(entropy * 10) / 10);
  out.penalties = penalties;

  // crack time @ 10 billion guesses/sec (offline, fast hash)
  const guesses = Math.pow(2, out.estimated_entropy_bits);
  const seconds = guesses / 1e10;
  const units = [[31536000000, 'billion years'], [31536000, 'years'], [86400, 'days'], [3600, 'hours'], [60, 'minutes'], [1, 'seconds']];
  let crack = 'instant';
  for (const [s, name] of units) {
    if (seconds >= s) { crack = `${(seconds / s).toFixed(1)} ${name}`; break; }
  }
  out.estimated_crack_time_offline = crack;

  // score 0-4 (zxcvbn-ish bands)
  const e = out.estimated_entropy_bits;
  out.score = e < 28 ? 0 : e < 36 ? 1 : e < 60 ? 2 : e < 100 ? 3 : 4;
  out.strength = ['very weak', 'weak', 'fair', 'strong', 'very strong'][out.score];

  // recommendations
  const recs = [];
  if (pw.length < 12) recs.push('use at least 12 characters');
  if (!upper || !lower) recs.push('mix upper and lower case');
  if (!digit) recs.push('add digits');
  if (!special) recs.push('add special characters');
  if (Object.keys(penalties).length) recs.push('avoid patterns and common words');
  out.recommendations = recs;

  return json(res, 200, out);
}

module.exports = { routePassword };
