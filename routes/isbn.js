// ISBN-10 / ISBN-13 validator + conversion
function clean(s) { return String(s || '').replace(/[\s-]/g, '').toUpperCase(); }
function isbn10Check(d9) {
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (+d9[i]) * (10 - i);
  const r = (11 - (sum % 11)) % 11;
  return r === 10 ? 'X' : String(r);
}
function isbn13Check(d12) {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += (+d12[i]) * (i % 2 ? 3 : 1);
  return String((10 - (sum % 10)) % 10);
}
function validate(input) {
  const d = clean(input);
  if (!/^[\dX]+$/.test(d)) return { error: 'ISBN must contain digits (and possibly X)' };
  if (d.length === 10) {
    if (!/^\d{9}[\dX]$/.test(d)) return { error: 'invalid ISBN-10 format' };
    const expected = isbn10Check(d.slice(0, 9));
    const valid = expected === d[9];
    return { isbn: d, type: 'ISBN-10', valid, checkDigitProvided: d[9], checkDigitExpected: expected, convertedTo13: valid ? to13(d) : null };
  }
  if (d.length === 13) {
    if (!/^\d{13}$/.test(d)) return { error: 'invalid ISBN-13 format' };
    const expected = isbn13Check(d.slice(0, 12));
    const valid = expected === d[12];
    return { isbn: d, type: 'ISBN-13', valid, checkDigitProvided: d[12], checkDigitExpected: expected, gs1Prefix: d.slice(0,3), registrationGroup: null, convertedTo10: d.startsWith('978') ? to10(d) : null };
  }
  return { error: `length must be 10 or 13, got ${d.length}` };
}
function to13(isbn10) {
  const core = '978' + isbn10.slice(0, 9);
  return core + isbn13Check(core);
}
function to10(isbn13) {
  const core = isbn13.slice(3, 12);
  return core + isbn10Check(core);
}
function routeIsbn(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  if (!q.isbn) return json(res, 400, { error: 'missing ?isbn= parameter' });
  return json(res, 200, validate(q.isbn));
}
module.exports = { routeIsbn, validate };
