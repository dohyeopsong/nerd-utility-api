// /isbn — ISBN validation: ISBN-10 and ISBN-13, conversion between formats
function routeIsbn(u, res, json) {
  const q = u.searchParams;
  const raw = q.get('isbn');
  if (!raw) return json(res, 400, { error: 'provide ?isbn=', example: '/isbn?isbn=978-0-306-40615-7' });
  const s = raw.replace(/[-\s]/g, '').toUpperCase();

  if (!/^[0-9X]{10}$|^[0-9]{13}$/.test(s))
    return json(res, 400, { error: 'must be 10 digits (last may be X) or 13 digits' });

  const result = { isbn: s, type: s.length === 10 ? 'isbn10' : 'isbn13', valid: false };

  if (s.length === 10) {
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      const c = s[i];
      const v = c === 'X' ? 10 : +c;
      if (c === 'X' && i !== 9) return json(res, 400, { error: 'X only allowed as last char of ISBN-10' });
      sum += v * (10 - i);
    }
    result.valid = sum % 11 === 0;
    if (result.valid && s.startsWith('978') === false) {
      // convert to isbn13 (only meaningful for 978-prefixed, but compute anyway)
      const core = '978' + s.slice(0, 9);
      result.isbn13 = core + isbn13Check(core);
      result.ean_prefix = result.isbn13.startsWith('978') || result.isbn13.startsWith('979') ? 'valid' : 'non-book EAN';
    }
  } else {
    if (!['978', '979'].includes(s.slice(0, 3))) result.warning = 'prefix is not 978/979 (not a book EAN)';
    let sum = 0;
    for (let i = 0; i < 13; i++) sum += +s[i] * (i % 2 === 0 ? 1 : 3);
    result.valid = sum % 10 === 0;
    if (result.valid) {
      // convert to isbn10 (only possible for 978 prefix)
      if (s.startsWith('978')) {
        const core = s.slice(3, 12);
        result.isbn10 = core + isbn10Check(core);
      } else {
        result.isbn10 = null;
        result.note = 'cannot convert 979-prefix to ISBN-10';
      }
    }
  }
  if (!result.valid) result.reason = 'checksum failed';
  return json(res, 200, result);
}

function isbn13Check(core12) {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += +core12[i] * (i % 2 === 0 ? 1 : 3);
  return String((10 - (sum % 10)) % 10);
}

function isbn10Check(core9) {
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += +core9[i] * (10 - i);
  const r = (11 - (sum % 11)) % 11;
  return r === 10 ? 'X' : String(r);
}

module.exports = { routeIsbn };
