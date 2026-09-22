// routes/luhn.js — Luhn algorithm checksum validation
// GET /luhn?number=4532015112830366
function routeLuhn(u, res, json) {
  const raw = u.searchParams.get('number');
  if (!raw) return json(res, 400, { error: 'number required' });
  const digits = raw.replace(/[\s-]/g, '');
  if (!/^\d+$/.test(digits)) return json(res, 400, { error: 'digits only (spaces/dashes allowed)' });
  if (digits.length < 2) return json(res, 400, { error: 'need at least 2 digits' });
  let sum = 0, dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = +digits[i];
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d; dbl = !dbl;
  }
  const valid = sum % 10 === 0;
  const brand = /^4/.test(digits) ? 'visa' : /^5[1-5]/.test(digits) ? 'mastercard' : /^3[47]/.test(digits) ? 'amex' : /^6(011|5)/.test(digits) ? 'discover' : 'unknown';
  const partial = digits.slice(0, -1);
  let check = 0;
  let s2 = 0, d2 = false;
  for (let i = partial.length - 1; i >= 0; i--) { let d = +partial[i]; if (d2) { d *= 2; if (d > 9) d -= 9; } s2 += d; d2 = !d2; }
  check = (10 - (s2 % 10)) % 10;
  return json(res, 200, {
    number: digits, valid, brand,
    checkDigit: +digits[digits.length - 1],
    computedCheckDigit: check,
    checkDigitMatches: +digits[digits.length - 1] === check,
    length: digits.length,
    corrected: valid ? digits : partial + check
  });
}
module.exports = { routeLuhn };
