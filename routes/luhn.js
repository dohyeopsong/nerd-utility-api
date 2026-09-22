// /luhn — Luhn algorithm validation (credit cards, IMEI, etc.)
function routeLuhn(u, res, json) {
  const q = u.searchParams;
  const mode = (q.get('mode') || 'validate').toLowerCase();
  const digits = (q.get('number') || q.get('v') || '').replace(/[\s-]/g, '');
  if (!digits) return json(res, 400, { error: 'number required' });
  if (!/^\d{6,19}$/.test(digits)) return json(res, 400, { error: 'number must be 6-19 digits' });
  // Luhn: from rightmost digit, double every 2nd, subtract 9 if >9, sum % 10 == 0
  let sum = 0, dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = +digits[i];
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d; dbl = !dbl;
  }
  const valid = sum % 10 === 0;
  // detect network by length + prefix (only if length matches typical range)
  let network = 'unknown';
  const p = digits.slice(0, 4);
  const p2 = +digits.slice(0, 2), p4 = +digits.slice(0, 4), p1 = +digits[0];
  if (digits.length === 16 || digits.length === 15) {
    if (p1 === 4 && (digits.length === 13 || digits.length === 16 || digits.length === 19)) network = 'visa';
    else if ((p2 >= 51 && p2 <= 55) && digits.length === 16) network = 'mastercard';
    else if ((p2 === 34 || p2 === 37) && digits.length === 15) network = 'amex';
    else if ((p4 === 6011 || p2 === 65 || (p >= 622126 && p <= 622925)) && digits.length === 16) network = 'discover';
    else if (p2 === 36 && digits.length === 14) network = 'diners-club';
    else if (p1 === 3 && digits.length === 15) network = 'jcb/unknown';
    else if (p2 >= 22 && p2 <= 27 && digits.length === 16) network = 'mastercard';
  } else if (digits.length === 15) {
    if (p1 === 3) network = 'amex or jcb';
  }
  // IMEI check (15 digits, always Luhn valid by design)
  const isImeiLength = digits.length === 15;
  return json(res, 200, {
    number: digits,
    length: digits.length,
    valid,
    checksum_digit: valid ? +digits[digits.length - 1] : null,
    possible_network: network !== 'unknown' ? network : undefined,
    imei_format: isImeiLength,
    note: 'Luhn check only; does not prove the number is active or assigned'
  });
}
module.exports = { routeLuhn };
