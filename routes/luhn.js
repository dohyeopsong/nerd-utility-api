// Generic Luhn algorithm validator with card-type detection (no card storage — validation only)
function luhn(digits) {
  let sum = 0, alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = +digits[i];
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d; alt = !alt;
  }
  return sum % 10 === 0;
}
function cardType(d) {
  if (/^4/.test(d)) return 'Visa';
  if (/^(5[1-5]|2(2[2-9]|[3-6]|7[01]|720))/.test(d)) return 'Mastercard';
  if (/^3[47]/.test(d)) return 'American Express';
  if (/^(6011|65|64[4-9])/.test(d)) return 'Discover';
  if (/^3(0[0-5]|[68])/.test(d)) return 'Diners Club';
  if (/^35/.test(d)) return 'JCB';
  return null;
}
function validate(input) {
  const d = String(input || '').replace(/[\s-]/g, '');
  if (!/^\d+$/.test(d)) return { error: 'input must contain digits only (spaces/dashes allowed)' };
  if (d.length < 2) return { error: 'too short' };
  const out = { digits: d.length, valid: luhn(d) };
  if (d.length >= 12 && d.length <= 19) out.cardType = cardType(d);
  return out;
}
function routeLuhn(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  if (!q.n && !q.number) return json(res, 400, { error: 'missing ?number= parameter' });
  return json(res, 200, validate(q.n || q.number));
}
module.exports = { routeLuhn, luhn };
