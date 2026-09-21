// Generic Luhn check-digit validator with card network detection
function luhnCheck(numStr) {
  const s = String(numStr).replace(/[\s-]/g, '');
  if (!/^\d{2,19}$/.test(s)) return { valid: false, reason: 'must be 2-19 digits' };
  let sum = 0, dbl = false;
  for (let i = s.length - 1; i >= 0; i--) {
    let d = +s[i];
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d; dbl = !dbl;
  }
  return { valid: sum % 10 === 0, luhnSum: sum, remainder: sum % 10 };
}
function cardType(s) {
  const n = String(s).replace(/[\s-]/g, '');
  if (/^4/.test(n)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'mastercard';
  if (/^3[47]/.test(n)) return 'amex';
  if (/^(6011|65|64[4-9])/.test(n)) return 'discover';
  if (/^(30[0-5]|36|38)/.test(n)) return 'diners';
  if (/^35/.test(n)) return 'jcb';
  return null;
}
function routeLuhn(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  if (!q.num) return json(res, 400, { error: 'provide ?num=<digits> (e.g. card number, IMEI base)' });
  const r = luhnCheck(q.num);
  return json(res, 200, { input: q.num, ...r, cardType: r.valid ? cardType(q.num) : cardType(q.num) });
}
module.exports = { routeLuhn, luhnCheck, cardType };
