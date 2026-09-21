// Luhn checksum validator with card network detection
function luhnCheck(num) {
  const digits = String(num).replace(/[\s-]/g, '');
  if (!/^\d+$/.test(digits)) return { valid: false, reason: 'not all digits' };
  if (digits.length < 2) return { valid: false, reason: 'too short' };
  let sum = 0, dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = +digits[i];
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d; dbl = !dbl;
  }
  return { valid: sum % 10 === 0, checksum: sum, length: digits.length };
}
function detectCard(digits) {
  const d = String(digits).replace(/[\s-]/g, '');
  const t = [
    [/^4/, [13,16,19], 'Visa'],
    [/^(5[1-5]|2(2[2-9]|[3-6]|7[01]|720))/, [16], 'Mastercard'],
    [/^3[47]/, [15], 'American Express'],
    [/^(6011|65|64[4-9])/, [16,19], 'Discover'],
    [/^(36|38|30[0-5])/, [14,16,19], 'Diners Club'],
    [/^(352[89]|35[3-8])/, [16,19], 'JCB']
  ];
  for (const [re, lens, name] of t) {
    if (re.test(d) && lens.includes(d.length)) return name;
  }
  return null;
}
function routeLuhn(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  if (!q.num && !q.number) return json(res, 400, { error: 'missing ?number= parameter' });
  const digits = String(q.num || q.number).replace(/[\s-]/g, '');
  const r = luhnCheck(digits);
  if (r.valid) r.cardType = detectCard(digits) || 'unknown';
  return json(res, 200, { input: digits, ...r });
}
module.exports = { routeLuhn, luhnCheck };
