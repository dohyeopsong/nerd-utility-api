// /isbn — validate and parse ISBN-10 / ISBN-13 numbers
function routeIsbn(u, res, json) {
  const p = u.searchParams;
  const raw = (p.get('isbn') || '').replace(/[-\s]/g, '');
  if (!raw) return json(res, 200, { usage: '?isbn=9780306406157 — validate and parse ISBN-10 or ISBN-13' });
  if (!/^\d{9}[\dXx]$|^\d{13}$/.test(raw)) return json(res, 400, { error: 'invalid format: must be 10 or 13 digits (ISBN-10 may end in X)' });
  const out = { input: raw, valid: false };
  if (raw.length === 10) {
    out.type = 'ISBN-10';
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      const c = raw[i];
      const v = c === 'X' || c === 'x' ? 10 : +c;
      sum += v * (10 - i);
    }
    out.valid = sum % 11 === 0;
    if (out.valid) {
      out.check_digit = raw[9];
      out.as_isbn13 = '978' + raw.slice(0, 9).replace(/x$/i, '') + (() => {
        const b = '978' + raw.slice(0, 9);
        let s = 0; for (let i = 0; i < 12; i++) s += +b[i] * (i % 2 ? 3 : 1);
        return String((10 - (s % 10)) % 10);
      })();
    }
  } else {
    out.type = 'ISBN-13';
    let s = 0;
    for (let i = 0; i < 13; i++) s += +raw[i] * (i % 2 ? 3 : 1);
    out.valid = s % 10 === 0;
    out.check_digit = raw[12];
    if (out.valid && raw.startsWith('978')) {
      // convert to ISBN-10 if EAN prefix is 978
      const core9 = raw.slice(3, 12);
      let s2 = 0; for (let i = 0; i < 9; i++) s2 += +core9[i] * (10 - i);
      const cd = (11 - (s2 % 11)) % 11;
      out.as_isbn10 = core9 + (cd === 10 ? 'X' : cd);
    }
    if (out.valid) out.gs1_prefix = raw.slice(0, 3);
  }
  return json(res, out.valid ? 200 : 422, out);
}
module.exports = { routeIsbn };
