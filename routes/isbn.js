// /isbn — ISBN-10 / ISBN-13 validation, conversion, and hyphenation helpers
function validateIsbn10(s) {
  const clean = s.replace(/[\s-]/g, '');
  if (!/^\d{9}[\dXx]$/.test(clean)) return { valid: false, error: 'ISBN-10 must be 9 digits + check char (digit or X)' };
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (10 - i) * (clean.charCodeAt(i) - 48);
  const last = clean[9];
  const checkVal = last === 'X' || last === 'x' ? 10 : last.charCodeAt(0) - 48;
  sum += checkVal;
  const valid = sum % 11 === 0;
  // expected check char
  let rem = 0;
  for (let i = 0; i < 9; i++) rem = (rem + (10 - i) * (clean.charCodeAt(i) - 48)) % 11;
  const expectedVal = (11 - rem) % 11;
  const expected = expectedVal === 10 ? 'X' : String(expectedVal);
  return { valid, type: 'ISBN-10', sum, expectedCheckChar: expected, receivedCheckChar: last.toUpperCase() };
}

function validateIsbn13(s) {
  const clean = s.replace(/[\s-]/g, '');
  if (!/^\d{13}$/.test(clean)) return { valid: false, error: 'ISBN-13 must be exactly 13 digits' };
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += (i % 2 === 0 ? 1 : 3) * (clean.charCodeAt(i) - 48);
  const rem = (10 - (sum % 10)) % 10;
  const received = clean.charCodeAt(12) - 48;
  return { valid: rem === received, type: 'ISBN-13', sum, expectedCheckDigit: rem, receivedCheckDigit: received };
}

function isbn10to13(ten) {
  const clean = ten.replace(/[\s-]/g, '');
  if (clean.length !== 10) return null;
  const core = '978' + clean.slice(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += (i % 2 === 0 ? 1 : 3) * (core.charCodeAt(i) - 48);
  return core + String((10 - (sum % 10)) % 10);
}

function isbn13to10(thirteen) {
  const clean = thirteen.replace(/[\s-]/g, '');
  if (clean.length !== 13 || !clean.startsWith('978')) return null;
  const core = clean.slice(3, 12); // 9 digits
  let rem = 0;
  for (let i = 0; i < 9; i++) rem = (rem + (10 - i) * (core.charCodeAt(i) - 48)) % 11;
  const check = (11 - rem) % 11;
  return core + (check === 10 ? 'X' : String(check));
}

function routeIsbn(u, res, json) {
  const p = u.searchParams;
  const raw = p.get('isbn');
  const convert = p.get('convert');
  if (!raw && !convert) return json(res, 400, { error: 'provide ?isbn=<value> or ?convert=<isbn>' });

  if (convert) {
    const clean = convert.replace(/[\s-]/g, '');
    if (clean.length === 10) {
      const r = validateIsbn10(clean);
      const converted = isbn10to13(clean);
      return json(res, 200, { input: clean, from: 'ISBN-10', to: 'ISBN-13', isbn13: converted, ...r });
    } else if (clean.length === 13) {
      const r = validateIsbn13(clean);
      const converted = clean.startsWith('978') ? isbn13to10(clean) : null;
      return json(res, 200, { input: clean, from: 'ISBN-13', to: 'ISBN-10', isbn10: converted, note: converted ? undefined : 'only 978-prefixed ISBN-13 convertible', ...r });
    }
    return json(res, 400, { error: 'ISBN must be 10 or 13 characters' });
  }

  const clean = raw.replace(/[\s-]/g, '');
  if (clean.length === 10) return json(res, 200, validateIsbn10(clean));
  if (clean.length === 13) return json(res, 200, validateIsbn13(clean));
  return json(res, 400, { error: 'ISBN must be 10 or 13 characters (got ' + clean.length + ')' });
}

module.exports = { routeIsbn, validateIsbn10, validateIsbn13, isbn10to13, isbn13to10 };
