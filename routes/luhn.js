// /luhn — Luhn algorithm: validate or compute check digit
function luhnCheckDigit(partial) {
  // partial = digits WITHOUT the check digit; compute the digit that makes the full number valid
  let sum = 0;
  const rev = partial.split('').reverse();
  // check digit will occupy position 1 (index 0 from right); partial digits start at position 2
  for (let i = 0; i < rev.length; i++) {
    let d = parseInt(rev[i], 10);
    if (i % 2 === 0) { // these are the "every second digit from the right" positions in the FULL number
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return String((10 - (sum % 10)) % 10);
}

function validateLuhn(raw) {
  const num = raw.replace(/[\s-]/g, '');
  const out = { input: raw, number: num, valid: false };
  if (!/^[0-9]+$/.test(num) || num.length < 2) { out.reason = 'digits only (min 2)'; return out; }
  const checkDigit = num.slice(-1);
  const partial = num.slice(0, -1);
  out.checkDigit = checkDigit;
  out.expectedCheckDigit = luhnCheckDigit(partial);
  out.checksumValid = checkDigit === out.expectedCheckDigit;
  if (!out.checksumValid) { out.reason = 'luhn checksum failed'; return out; }
  out.valid = true;
  return out;
}

function routeLuhn(u, res, json) {
  const q = u.searchParams.get('num') || u.searchParams.get('q');
  if (!q) return json(res, 400, { error: 'missing ?num=4532015112830366' });
  if (u.searchParams.get('mode') === 'checkdigit') {
    const digits = q.replace(/[\s-]/g, '');
    if (!/^[0-9]+$/.test(digits)) return json(res, 400, { error: 'digits only' });
    return json(res, 200, { partial: digits, checkDigit: luhnCheckDigit(digits), full: digits + luhnCheckDigit(digits) });
  }
  return json(res, 200, validateLuhn(q));
}

module.exports = { routeLuhn, validateLuhn, luhnCheckDigit };
