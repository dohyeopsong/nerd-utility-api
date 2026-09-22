// /isbn — ISBN-10/13 validation, conversion, hyphenation
function routeIsbn(u, res, json) {
  const q = u.searchParams;
  const check = q.get('check');
  const convert = q.get('convert');
  const inp = check || convert;
  if (!inp) return json(res, 400, { error: 'provide ?check=ISBN or ?convert=ISBN', example: '/isbn?check=9780306406157' });

  // normalize: strip spaces, hyphens
  const s = inp.replace(/[\s-]/g, '').toUpperCase();

  if (/[^0-9X]/.test(s)) { return json(res, 200, { input: inp, valid: false, reason: 'invalid characters' }); }

  const out = { input: inp, isbn: s };

  // ISBN-10
  if (s.length === 10) {
    if (!/^[0-9]{9}[0-9X]$/.test(s)) { out.valid = false; out.reason = 'bad ISBN-10 format'; return json(res, 200, out); }
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      const v = s[i] === 'X' && i === 9 ? 10 : +s[i];
      sum += v * (10 - i);
    }
    out.type = 'ISBN-10';
    out.valid = sum % 11 === 0;
    out.check_digit = s[9];
    out.expected_check_digit = String((11 - (sum - (s[9]==='X'?10:+s[9]))) % 11).replace('10','X');
    if (out.valid && convert) {
      out.converted_to_isbn13 = to13(s);
    }
    return json(res, 200, out);
  }

  // ISBN-13
  if (s.length === 13) {
    if (!/^[0-9]{13}$/.test(s)) { out.valid = false; out.reason = 'bad ISBN-13 format (X only valid in ISBN-10)'; return json(res, 200, out); }
    let sum = 0;
    for (let i = 0; i < 13; i++) sum += +s[i] * (i % 2 === 0 ? 1 : 3);
    out.type = 'ISBN-13';
    out.valid = sum % 10 === 0;
    out.check_digit = s[12];
    out.expected_check_digit = String((10 - sum % 10) % 10);
    // GS1 prefix: 978/979
    out.gs1_prefix = s.slice(0, 3);
    if (out.valid && convert) {
      out.converted_to_isbn10 = to10(s);
    }
    return json(res, 200, out);
  }

  out.valid = false;
  out.reason = `expected 10 or 13 digits, got ${s.length}`;
  return json(res, 200, out);
}

function to13(s10) {
  // ISBN-10 → ISBN-13: prepend 978, drop check digit, recompute
  const core = '978' + s10.slice(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += +core[i] * (i % 2 === 0 ? 1 : 3);
  return core + String((10 - sum % 10) % 10);
}

function to10(s13) {
  // ISBN-13 → ISBN-10: only valid for 978 prefix
  if (s13.slice(0,3) !== '978') return null;
  const core = s13.slice(3, 12);
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += +core[i] * (10 - i);
  const rem = (11 - (sum % 11)) % 11;
  return core + (rem === 10 ? 'X' : String(rem));
}

module.exports = { routeIsbn };
