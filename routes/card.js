// Credit card validator: Luhn checksum + issuer (IIN range) detection
function luhn(digits) {
  let sum = 0, alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d; alt = !alt;
  }
  return sum % 10 === 0;
}
const ISSUERS = [
  { name: 'Visa', test: d => /^4/.test(d), lengths: [13, 16, 19] },
  { name: 'Mastercard', test: d => /^(5[1-5]|2[2-7])/.test(d), lengths: [16] },
  { name: 'American Express', test: d => /^3[47]/.test(d), lengths: [15] },
  { name: 'Discover', test: d => /^(6011|65|64[4-9])/.test(d), lengths: [16, 19] },
  { name: 'Diners Club', test: d => /^(36|38|30[0-5])/.test(d), lengths: [14, 16, 19] },
  { name: 'JCB', test: d => /^35(2[89]|[3-8])/.test(d), lengths: [16, 17, 18, 19] },
  { name: 'UnionPay', test: d => /^62/.test(d), lengths: [16, 17, 18, 19] },
  { name: 'Maestro', test: d => /^(5018|5020|5038|6304|6759|676[1-3])/.test(d), lengths: [12, 13, 14, 15, 16, 17, 18, 19] }
];

function routeCard(u, res, json) {
  const num = (u.searchParams.get('card') || '').replace(/[\s-]/g, '');
  if (!num) return json(res, 400, { error: 'missing card param' });
  if (!/^\d{8,19}$/.test(num)) return json(res, 400, { error: 'invalid card number format' });
  const issuer = ISSUERS.find(i => i.test(num));
  const luhnValid = luhn(num);
  const lengthValid = issuer ? issuer.lengths.includes(num.length) : null;
  return json(res, 200, {
    card: num,
    valid: luhnValid && (lengthValid !== false),
    luhnValid,
    issuer: issuer ? issuer.name : 'unknown',
    length: num.length,
    lengthValid
  });
}
module.exports = { routeCard };
