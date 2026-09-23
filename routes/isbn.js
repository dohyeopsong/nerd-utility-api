// /isbn — ISBN-10/13 validation, ISBN-10 <-> ISBN-13 conversion
function clean(s) { return s.replace(/[-\s]/g, '').toUpperCase(); }
function isbn10Check(d) {
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (10 - i) * d[i];
  const rem = (11 - (sum % 11)) % 11;
  return rem === 10 ? 'X' : String(rem);
}
function isbn13Check(d) {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += d[i] * (i % 2 ? 3 : 1);
  return String((10 - (sum % 10)) % 10);
}
function routeIsbn(u, res, json) {
  const isbn = clean(u.searchParams.get('isbn') || '');
  if (!isbn) return json(res, 200, { usage: '?isbn=978-0-306-40615-7 — validate ISBN-10/13 (checksum + format), auto-convert between forms' });
  if (!/^[0-9]{9}[0-9X]$|^[0-9]{13}$/.test(isbn))
    return json(res, 400, { isbn: u.searchParams.get('isbn'), valid: false, error: 'must be 10 chars (9 digits + check digit/X) or 13 digits' });
  const out = { isbn: u.searchParams.get('isbn'), valid: false };
  if (isbn.length === 10) {
    const d = isbn.slice(0, 9).split('').map(Number);
    const expect = isbn10Check(d);
    out.type = 'ISBN-10';
    out.check_digit = expect;
    out.valid = isbn[9] === expect;
    if (out.valid) {
      const d13 = [9, 7, 8, ...d];
      out.isbn13 = '978' + isbn.slice(0, 9) + isbn13Check(d13);
    }
  } else {
    if (!['978', '979'].includes(isbn.slice(0, 3))) { out.type = 'ISBN-13'; out.error = 'must start with 978 or 979 (bookland)'; return json(res, 400, out); }
    const d = isbn.slice(0, 12).split('').map(Number);
    const expect = isbn13Check(d);
    out.type = 'ISBN-13';
    out.check_digit = expect;
    out.valid = isbn[12] === expect;
    if (out.valid && isbn.startsWith('978')) {
      const core = isbn.slice(3, 12);
      if (/^[0-9]{9}$/.test(core)) {
        const d10 = core.split('').map(Number);
        const chk = isbn10Check(d10);
        out.isbn10 = core + (chk === '10' ? 'X' : chk);
      }
    }
  }
  return json(res, out.valid ? 200 : 200, out);
}
module.exports = { routeIsbn };
