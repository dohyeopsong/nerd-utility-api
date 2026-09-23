// /isbn — ISBN-10/13 validation, checksum, conversion
function isbn13Checksum(d) {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += d[i] * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10;
}
function isbn10Checksum(d) {
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += d[i] * (10 - i);
  const r = (11 - (sum % 11)) % 11;
  return r === 10 ? 'X' : String(r);
}
function clean(s) { return s.replace(/[-\s]/g, '').toUpperCase(); }

function validateISBN13(s) {
  if (!/^\d{13}$/.test(s)) return { error: 'ISBN-13 must be 13 digits' };
  const d = [...s].map(Number);
  const check = isbn13Checksum(d);
  return { valid: d[12] === check, expectedCheckDigit: check, actualCheckDigit: d[12] };
}
function validateISBN10(s) {
  if (!/^\d{9}[\dX]$/.test(s)) return { error: 'ISBN-10 must be 9 digits + check digit (0-9 or X)' };
  const d = [...s.slice(0, 9)].map(Number);
  const check = isbn10Checksum(d);
  return { valid: s[9] === check, expectedCheckDigit: check, actualCheckDigit: s[9] };
}
function isbn10to13(s) {
  const core = '978' + s.slice(0, 9);
  const d = [...core].map(Number);
  return core + isbn13Checksum(d);
}
function isbn13to10(s) {
  if (!s.startsWith('978')) return { error: 'only ISBN-13 with prefix 978 can convert to ISBN-10' };
  const core = s.slice(3, 12);
  const d = [...core].map(Number);
  return core + isbn10Checksum(d);
}

function routeIsbn(u, res, json) {
  const p = u.searchParams;
  const q = p.get('isbn');
  if (!q) return json(res, 400, { error: 'provide ?isbn=978-3-16-148410-0' });
  const s = clean(q);
  const result = { input: q };
  if (/^\d{13}$/.test(s)) {
    Object.assign(result, validateISBN13(s), { type: 'ISBN-13' });
    if (result.valid && p.get('convert')) result.isbn10 = isbn13to10(s);
  } else if (/^\d{9}[\dX]$/.test(s)) {
    Object.assign(result, validateISBN10(s), { type: 'ISBN-10' });
    if (result.valid && p.get('convert')) result.isbn13 = isbn10to13(s);
  } else {
    return json(res, 400, { error: 'not a valid ISBN-10 or ISBN-13 format' });
  }
  return json(res, 200, result);
}

module.exports = { routeIsbn, validateISBN10, validateISBN13, isbn10to13, isbn13to10 };
