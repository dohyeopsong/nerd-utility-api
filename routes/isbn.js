// /isbn — ISBN-10/13 validation and hyphenation
function isbn10Check(d) { // d: 9 digits, returns check char
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (10 - i) * d[i];
  const r = (11 - (sum % 11)) % 11;
  return r === 10 ? 'X' : String(r);
}
function routeIsbn(u, res, json) {
  const p = u.searchParams;
  const raw = p.get('isbn');
  if (!raw) return json(res, 200, { usage: '?isbn=9780306406157 — validates ISBN-10 and ISBN-13, computes check digits' });
  const clean = raw.replace(/[^0-9Xx]/g, '').toUpperCase();
  const mode = p.get('mode'); // 'check10' or 'check13' to compute check digit
  if (mode === 'check10' || mode === 'check13') {
    const body = clean.slice(0, mode === 'check10' ? 9 : 12).split('').map(Number);
    if (mode === 'check10') {
      if (body.length !== 9 || body.some(isNaN)) return json(res, 400, { error: 'need 9 digits for check10' });
      return json(res, 200, { type: 'ISBN-10', check_digit: isbn10Check(body), full: clean.slice(0, 9) + isbn10Check(body) });
    } else {
      if (clean.length !== 12 || [...clean].some(c => isNaN(c))) return json(res, 400, { error: 'need 12 digits for check13' });
      let sum = 0;
      for (let i = 0; i < 12; i++) sum += +clean[i] * (i % 2 === 0 ? 1 : 3);
      return json(res, 200, { type: 'ISBN-13', check_digit: String((10 - (sum % 10)) % 10), full: clean + String((10 - (sum % 10)) % 10) });
    }
  }

  if (clean.length === 10) {
    if (!/^\d{9}[\dX]$/.test(clean)) return json(res, 400, { error: 'invalid ISBN-10 format' });
    const digits = clean.slice(0, 9).split('').map(Number);
    const expected = isbn10Check(digits);
    const valid = clean[9] === expected;
    // convert to ISBN-13
    const i13 = '978' + clean.slice(0, 9);
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += +i13[i] * (i % 2 === 0 ? 1 : 3);
    return json(res, 200, { type: 'ISBN-10', valid, check_digit: clean[9], expected_check_digit: expected, isbn13: i13 + String((10 - (sum % 10)) % 10) });
  }
  if (clean.length === 13) {
    if (!/^\d{13}$/.test(clean)) return json(res, 400, { error: 'invalid ISBN-13 format' });
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += +clean[i] * (i % 2 === 0 ? 1 : 3);
    const expected = String((10 - (sum % 10)) % 10);
    return json(res, 200, { type: 'ISBN-13', valid: clean[12] === expected, check_digit: clean[12], expected_check_digit: expected, prefix: clean.slice(0, 3) === '978' || clean.slice(0, 3) === '979' ? clean.slice(0, 3) : null });
  }
  return json(res, 400, { error: 'ISBN must be 10 or 13 digits' });
}
module.exports = { routeIsbn };
