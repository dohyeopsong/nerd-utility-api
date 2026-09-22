// /luhn — Luhn algorithm validation + check-digit generation
function routeLuhn(u, res, json) {
  const q = u.searchParams;
  const compute = q.get('compute');  // partial number to compute check digit for
  const check = q.get('check');       // full number to validate

  if (compute !== null) {
    const s = compute.replace(/[\s-]/g, '');
    if (!/^\d+$/.test(s)) return json(res, 400, { error: 'digits only' });
    return json(res, 200, { input: s, check_digit: luhnCheckDigit(s), complete: s + luhnCheckDigit(s) });
  }
  if (check !== null) {
    const s = check.replace(/[\s-]/g, '');
    if (!/^\d+$/.test(s)) return json(res, 400, { error: 'digits only' });
    const ok = luhnValid(s);
    return json(res, 200, { input: s, valid: ok, expected_check_digit: s.slice(0, -1) + luhnCheckDigit(s.slice(0, -1)) });
  }
  return json(res, 400, { error: 'provide ?check=NUM or ?compute=PARTIAL', examples: ['/luhn?check=4532015112830366', '/luhn?compute=453201511283036'] });
}

function luhnCheckDigit(partial) {
  let sum = 0, dbl = true; // rightmost of partial will be doubled
  for (let i = partial.length - 1; i >= 0; i--) {
    let d = +partial[i];
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    dbl = !dbl;
  }
  return String((10 - (sum % 10)) % 10);
}
function luhnValid(s) {
  return luhnCheckDigit(s.slice(0, -1)) === s.slice(-1);
}

module.exports = { routeLuhn };
