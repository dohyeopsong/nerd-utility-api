// /luhn — Luhn algorithm: validate & compute check digit
function luhnCheckDigit(digits) {
  let sum = 0, dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits[i];
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d; dbl = !dbl;
  }
  return (10 - (sum % 10)) % 10;
}

function routeLuhn(u, res, json) {
  const p = u.searchParams;
  const q = p.get('n') || p.get('number');
  if (!q) return json(res, 400, { error: 'provide ?n=<digits> (check digit optional for checkdigit mode)' });
  const s = q.replace(/[\s-]/g, '');
  if (!/^\d+$/.test(s)) return json(res, 400, { error: 'only digits (spaces/dashes allowed)' });

  if (p.get('mode') === 'checkdigit') {
    // parity must match append scenario: rightmost payload digit gets doubled
    const dd = [...s].map(Number);
    let sum = 0, dbl = true;
    for (let i = dd.length - 1; i >= 0; i--) {
      let d = dd[i];
      if (dbl) { d *= 2; if (d > 9) d -= 9; }
      sum += d; dbl = !dbl;
    }
    return json(res, 200, { input: s, checkDigit: (10 - (sum % 10)) % 10 });
  }

  const digits = [...s].map(Number);
  const last = digits.pop();
  const expected = luhnCheckDigit([...digits, 0]); // compute over payload with 0 then derive
  // proper: check digit for payload
  let sum = 0, dbl = true; // parity: payload + check, dbl starts true from rightmost (check pos)
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits[i];
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d; dbl = !dbl;
  }
  const check = (10 - (sum % 10)) % 10;
  return json(res, 200, {
    input: q, valid: last === check,
    expectedCheckDigit: check, actualCheckDigit: last
  });
}

module.exports = { routeLuhn };
