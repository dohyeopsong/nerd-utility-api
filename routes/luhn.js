// /luhn — Luhn algorithm: validate card/ID numbers, compute check digit, or generate test numbers
function luhnSum(digits) {
  // digits: array of numbers, rightmost first
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = digits[i];
    if (i % 2 === 1) { // every second digit from right
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum;
}

function validateLuhn(numStr) {
  const s = numStr.replace(/[\s-]/g, '');
  if (!/^\d{2,}$/.test(s)) return { valid: false, error: 'must be 2+ digits' };
  const digits = [...s].reverse().map(Number);
  const sum = luhnSum(digits);
  return { valid: sum % 10 === 0, checksumTotal: sum };
}

function checkDigit(base) {
  // compute the check digit to append to base
  const digits = [...base].reverse().map(Number);
  digits.unshift(0); // placeholder for check digit
  const sum = luhnSum(digits);
  return (10 - (sum % 10)) % 10;
}

function generateLuhn(length) {
  // random number of given length that passes Luhn
  const crypto = require('crypto');
  let base = '';
  for (let i = 0; i < length - 1; i++) base += crypto.randomInt(0, 10);
  return base + checkDigit(base);
}

function routeLuhn(u, res, json) {
  const p = u.searchParams;
  const num = p.get('number') || p.get('num');
  const mode = p.get('mode') || 'validate';

  if (mode === 'checkdigit' || mode === 'check') {
    if (!num || !/^\d{1,}$/.test(num.replace(/[\s-]/g, ''))) return json(res, 400, { error: 'provide ?number=<digits>' });
    const base = num.replace(/[\s-]/g, '');
    const cd = checkDigit(base);
    return json(res, 200, { base, checkDigit: cd, full: base + cd });
  }

  if (mode === 'generate' || mode === 'gen') {
    const length = Math.min(19, Math.max(2, parseInt(p.get('length'), 10) || 16));
    const count = Math.min(25, Math.max(1, parseInt(p.get('count'), 10) || 1));
    const out = [];
    for (let i = 0; i < count; i++) out.push(generateLuhn(length));
    return json(res, 200, { length, count, numbers: out });
  }

  // default: validate
  if (!num) return json(res, 400, { error: 'provide ?number=<digits> or ?mode=checkdigit|generate' });
  const r = validateLuhn(num);
  const out = { input: num, ...r };
  if (r.valid !== undefined && !r.error) {
    const clean = num.replace(/[\s-]/g, '');
    const expected = checkDigit(clean.slice(0, -1));
    out.expectedCheckDigit = expected;
    if (!r.valid) out.suggestion = clean.slice(0, -1) + expected;
  }
  return json(res, 200, out);
}

module.exports = { routeLuhn, validateLuhn, checkDigit };
