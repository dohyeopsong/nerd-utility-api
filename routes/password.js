// Password strength: charset entropy + crack-time estimates + common-pattern checks
const COMMON = ['password','123456','123456789','qwerty','abc123','letmein','admin','welcome','monkey','dragon','iloveyou','football','princess','sunshine','trustno1','passw0rd'];
function strength(pw) {
  if (!pw) return { error: 'missing ?password= parameter' };
  if (typeof pw !== 'string' || pw.length > 128) return { error: 'password too long (max 128)' };
  const len = pw.length;
  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/\d/.test(pw)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) pool += 33;
  const entropy = len * Math.log2(pool || 1);
  const warnings = [];
  if (len < 12) warnings.push('shorter than 12 characters');
  const lower = pw.toLowerCase();
  if (COMMON.some(c => lower.includes(c))) warnings.push('contains a common password substring');
  if (/(.)\1{2,}/.test(pw)) warnings.push('repeated character run');
  if (/(012|123|234|345|456|567|678|789|abc|bcd|cde|def)/i.test(pw)) warnings.push('sequential characters');
  if (/^\d+$/.test(pw)) warnings.push('digits only');
  if (/^[a-z]+$/, 'i', /^[A-Za-z]+$/.test(pw) && pool <= 52) warnings.push('letters only');
  if (/(19|20)\d{2}/.test(pw)) warnings.push('possible year embedded');
  // crack times: 10^4 online (10/s), offline slow hash 10^7/s, offline fast 10^11/s
  const guesses = Math.pow(2, entropy);
  const fmt = s => s < 60 ? s.toFixed(0)+'s' : s < 3600 ? (s/60).toFixed(0)+'m' : s < 86400 ? (s/3600).toFixed(0)+'h' : s < 31557600 ? (s/86400).toFixed(0)+'d' : s < 31557600*1000 ? (s/31557600).toFixed(0)+'y' : (s/31557600/1e9).toExponential(2)+' billion years';
  const score = entropy < 28 ? 0 : entropy < 36 ? 1 : entropy < 60 ? 2 : entropy < 80 ? 3 : 4;
  const labels = ['very weak','weak','fair','strong','very strong'];
  return {
    length: len,
    charsetSize: pool,
    entropyBits: +entropy.toFixed(1),
    score,
    rating: labels[score],
    warnings,
    crackTime: {
      onlineThrottled: fmt(guesses / 100),
      offlineSlowHash: fmt(guesses / 1e7),
      offlineFastHash: fmt(guesses / 1e11)
    },
    note: 'entropy is a heuristic; do not submit real passwords to third-party services'
  };
}
function routePassword(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  return json(res, 200, strength(q.password));
}
module.exports = { routePassword, strength };
