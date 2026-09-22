// /isbn — ISBN-10/ISBN-13 validation, check digits, and 10<->13 conversion
function routeIsbn(u, res, json) {
  const q = u.searchParams;
  const raw = q.get('isbn') || q.get('code') || q.get('text');
  if (!raw) return json(res, 400, { error: 'provide ?isbn=', example: '/isbn?isbn=0-306-40615-2' });
  const s = raw.replace(/[\s-]/g, '').toUpperCase();

  // ISBN-10: 9 digits + check (digit or X). Weights 10..2, mod 11.
  if (/^\d{9}[\dX]$/.test(s)) {
    const sum = [...s.slice(0, 9)].reduce((a, d, i) => a + (+d) * (10 - i), 0);
    const expected = (11 - (sum % 11)) % 11;
    const given = s[9] === 'X' ? 10 : +s[9];
    const result = {
      isbn: s, type: 'ISBN-10', valid: given === expected,
      check_digit_given: s[9], check_digit_expected: expected === 10 ? 'X' : String(expected),
      isbn13: to13(s),
    };
    if (!result.valid) result.corrected = s.slice(0, 9) + (expected === 10 ? 'X' : String(expected));
    return json(res, 200, result);
  }

  // ISBN-13: 12 digits + check. Weights 1,3 alternating, mod 10.
  if (/^\d{13}$/.test(s)) {
    if (!s.startsWith('978') && !s.startsWith('979'))
      return json(res, 400, { error: 'ISBN-13 must start with 978 or 979' });
    const sum = [...s.slice(0, 12)].reduce((a, d, i) => a + (+d) * (i % 2 ? 3 : 1), 0);
    const expected = (10 - (sum % 10)) % 10;
    const given = +s[12];
    const result = {
      isbn: s, type: 'ISBN-13', valid: given === expected,
      check_digit_given: given, check_digit_expected: expected,
      isbn10: s.startsWith('978') ? to10(s) : null,
      hyphenated: s.slice(0,3) + '-' + hyphenBody(s.slice(3)),
    };
    if (!result.valid) result.corrected = s.slice(0, 12) + String(expected);
    return json(res, 200, result);
  }

  return json(res, 400, { error: 'not a valid ISBN form (expect 10 or 13 digits)' });
}

// ISBN-10 -> ISBN-13 (must be 978-prefixed space)
function to13(s10) {
  const core = '978' + s10.slice(0, 9);
  const sum = [...core].reduce((a, d, i) => a + (+d) * (i % 2 ? 3 : 1), 0);
  return core + String((10 - (sum % 10)) % 10);
}

// ISBN-13 (978) -> ISBN-10
function to10(s13) {
  const core = s13.slice(3, 12); // drop 978 prefix and check digit
  const sum = [...core].reduce((a, d, i) => a + (+d) * (10 - i), 0);
  const cd = (11 - (sum % 11)) % 11;
  return core + (cd === 10 ? 'X' : String(cd));
}

// naive hyphenation: 978-AAA-BB-CCCCC-D style by registration group length guess
function hyphenBody(b) {
  // common group lengths: 1 (e.g. 0,1 English), 2 (e.g. 84 Spain), 3+ others
  const two = ['84','80','83','88','90','91','94','95','962','960','987','9971'];
  const g = two.find(t => b.startsWith(t));
  if (g) return b.slice(0, g.length) + '-' + b.slice(g.length, 6) + '-' + b.slice(6);
  return b.slice(0, 1) + '-' + b.slice(1, 5) + '-' + b.slice(5);
}

module.exports = { routeIsbn };
