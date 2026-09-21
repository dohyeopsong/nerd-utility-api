// /isbn?number=9780306406157 → ISBN-10/13 validator + conversion between formats
function routeIsbn(u, res, json) {
  const raw = u.searchParams.get('number') || u.searchParams.get('isbn');
  if (!raw) return json(res, 400, { error: 'pass number=<ISBN-10 or ISBN-13>' });
  let num = raw.toUpperCase().replace(/[\s-]/g, '');
  const is10 = /^[0-9]{9}[0-9X]$/.test(num);
  const is13 = /^[0-9]{13}$/.test(num);
  if (!is10 && !is13) return json(res, 400, { error: 'must be ISBN-10 (9 digits + check) or ISBN-13' });

  let out = { input: raw, cleaned: num };

  if (is10) {
    // mod-11 weighted sum
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      const d = num[i] === 'X' ? 10 : +num[i];
      sum += d * (10 - i);
    }
    out.type = 'ISBN-10';
    out.valid = sum % 11 === 0;
    // convert to ISBN-13: prefix 978, recompute EAN check
    const body13 = '978' + num.slice(0, 9);
    let s = 0;
    for (let i = 0; i < 12; i++) s += +body13[i] * (i % 2 === 0 ? 1 : 3);
    out.isbn13 = body13 + String((10 - (s % 10)) % 10);
    out.registrationGroup = null; // varies, not decoded
  } else {
    // ISBN-13: EAN-13 with 978/979 prefix
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += +num[i] * (i % 2 === 0 ? 1 : 3);
    const expected = (10 - (sum % 10)) % 10;
    out.type = 'ISBN-13';
    out.valid = +num[12] === expected;
    out.isBookland = num.startsWith('978') || num.startsWith('979');
    // convert to ISBN-10 if 978
    if (num.startsWith('978')) {
      const body10 = num.slice(3, 12);
      let s2 = 0;
      for (let i = 0; i < 9; i++) s2 += +body10[i] * (10 - i);
      const r = (11 - (s2 % 11)) % 11;
      out.isbn10 = body10 + (r === 10 ? 'X' : String(r));
    } else out.isbn10 = null; // 979 has no ISBN-10 equivalent
  }
  return json(res, 200, out);
}
module.exports = { routeIsbn };
