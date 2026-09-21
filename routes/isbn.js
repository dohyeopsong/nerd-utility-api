// ISBN-10 / ISBN-13 validator with hyphen normalization
function clean(s) { return String(s).replace(/[-\s]/g, '').toUpperCase(); }
function isValidISBN10(s) {
  s = clean(s);
  if (!/^\d{9}[\dX]$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const d = s[i] === 'X' ? 10 : +s[i];
    sum += d * (10 - i);
  }
  return sum % 11 === 0;
}
function isValidISBN13(s) {
  s = clean(s);
  if (!/^\d{13}$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) sum += +s[i] * (i % 2 === 0 ? 1 : 3);
  return sum % 10 === 0;
}
function isbn13To10(s13) {
  s13 = clean(s13);
  if (!isValidISBN13(s13) || !s13.startsWith('978')) return null;
  const core = s13.slice(3, 12);
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += +core[i] * (10 - i);
  const rem = (11 - (sum % 11)) % 11;
  return core + (rem === 10 ? 'X' : rem);
}
function isbn10To13(s10) {
  s10 = clean(s10);
  if (!isValidISBN10(s10)) return null;
  const core = '978' + s10.slice(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += +core[i] * (i % 2 === 0 ? 1 : 3);
  return core + ((10 - (sum % 10)) % 10);
}
function routeIsbn(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  const input = q.isbn || q.number;
  if (!input) return json(res, 400, { error: 'provide ?isbn=<ISBN-10 or ISBN-13>' });
  const c = clean(input);
  const r = { input, normalized: c, valid: false, type: null };
  if (isValidISBN10(c)) { r.valid = true; r.type = 'ISBN-10'; r.isbn13 = isbn10To13(c); }
  else if (isValidISBN13(c)) { r.valid = true; r.type = 'ISBN-13'; r.isbn10 = isbn13To10(c); }
  return json(res, 200, r);
}
module.exports = { routeIsbn, isValidISBN10, isValidISBN13, isbn10To13, isbn13To10 };
