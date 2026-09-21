// Password strength analyzer: entropy estimate, charset detection, common-pattern & breach-list flags, crack-time estimates
const COMMON = ['password','123456','123456789','qwerty','abc123','letmein','monkey','dragon','111111','iloveyou','admin','welcome','login','princess','sunshine','football','master','shadow','superman','trustno1'];
function routePwstrength(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  const pw = q.pw || q.password || q.p || '';
  if (!pw) return json(res, 400, { error: 'provide ?pw=<password to analyze>' });
  const len = pw.length;
  let pool = 0;
  const sets = {
    lowercase: /[a-z]/.test(pw), uppercase: /[A-Z]/.test(pw),
    digits: /[0-9]/.test(pw), symbols: /[^a-zA-Z0-9]/.test(pw),
  };
  if (sets.lowercase) pool += 26;
  if (sets.uppercase) pool += 26;
  if (sets.digits) pool += 10;
  if (sets.symbols) pool += 33;
  let entropy = len * Math.log2(pool || 1);

  // penalties: repeated chars, sequences, common words, dates
  const repeats = /(.)\1{2,}/.test(pw);
  const seq = /(?:0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|qwer|wert|erty|asdf|zxcv)/i.test(pw);
  const common = COMMON.some(w => pw.toLowerCase().includes(w));
  const year = /(19|20)\d{2}/.test(pw);
  if (repeats) entropy *= 0.8;
  if (seq) entropy *= 0.85;
  if (common) entropy = Math.min(entropy, 20);
  if (year && len <= 8) entropy *= 0.9;

  const guesses = Math.pow(2, entropy);
  // offline fast hash ~1e10/s, online ~1e4/s
  const secsOffline = guesses / 1e10;
  const fmt = s => {
    if (s < 1) return 'instantly';
    const units = [['year', 31557600], ['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1]];
    if (s < 60) return s.toFixed(1) + ' seconds';
    for (const [name, sec] of units) if (s >= sec) { const v = s / sec; return `${v > 100 ? Math.round(v).toLocaleString() : v.toFixed(1)} ${name}${v >= 2 ? 's' : ''}`; }
  };
  let score = 0; // 0-4 (zxcvbn-style bands)
  if (entropy >= 28) score = 1;
  if (entropy >= 36) score = 2;
  if (entropy >= 60) score = 3;
  if (entropy >= 90) score = 4;
  const labels = ['very weak', 'weak', 'fair', 'strong', 'very strong'];
  return json(res, 200, {
    length: len, charsets: sets, entropyBits: +entropy.toFixed(1),
    score, label: labels[score],
    warnings: [repeats && 'repeated characters', seq && 'keyboard/char sequence', common && 'contains common password', year && 'contains a year'].filter(Boolean),
    crackTime: { offlineFastHash: fmt(secsOffline), onlineThrottled: fmt(guesses / 1e4) },
  });
}
module.exports = { routePwstrength };
