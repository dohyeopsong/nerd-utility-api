// /isbn — ISBN-10/ISBN-13 validation, format conversion, hyphenation
function routeIsbn(u, res, json) {
  const q = u.searchParams;
  const raw = q.get('isbn');
  if (!raw) return json(res, 400, { error: 'provide ?isbn=', example: '/isbn?isbn=978-0-306-40615-7' });
  const s = raw.replace(/[-\s]/g, '').toUpperCase();

  if (!/^[0-9X]+$/.test(s))
    return json(res, 200, { isbn: s, valid: false, reason: 'invalid characters (digits and X only)' });

  let result = { isbn: s, type: s.length === 10 ? 'ISBN-10' : s.length === 13 ? 'ISBN-13' : null };
  if (!result.type) {
    result.valid = false;
    result.reason = `length must be 10 or 13, got ${s.length}`;
    return json(res, 200, result);
  }

  if (s.length === 10) {
    result.check_digit = s[9];
    result.checksum_ok = isbn10Check(s);
    result.valid = result.checksum_ok;
    if (!result.checksum_ok) {
      result.expected_check_digit = isbn10Expected(s.slice(0, 9));
      result.reason = 'ISBN-10 checksum failed';
    } else {
      result.isbn13 = to13(s);
    }
  } else {
    // ISBN-13 must start with 978 or 979
    if (!/^(978|979)/.test(s)) {
      result.valid = false;
      result.reason = 'ISBN-13 must start with 978 or 979';
      return json(res, 200, result);
    }
    result.check_digit = s[12];
    result.checksum_ok = isbn13Check(s);
    result.valid = result.checksum_ok;
    if (!result.checksum_ok) {
      result.expected_check_digit = isbn13Expected(s.slice(0, 12));
      result.reason = 'ISBN-13 checksum failed';
    } else {
      result.isbn10 = to10(s);
    }
  }

  if (result.valid) {
    result.ean = 'ISBN-13: ' + (result.isbn13 || s); // display hint
    result.hyphenated = hyphenate(result.isbn13 || s);
  }
  return json(res, 200, result);
}

function isbn10Check(s) {
  // weights 10..2 for first 9, check char: value X=10
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (10 - i) * (+s[i]);
  const check = s[9] === 'X' ? 10 : +s[9];
  sum += check;
  return sum % 11 === 0;
}
function isbn10Expected(first9) {
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (10 - i) * (+first9[i]);
  const r = (11 - (sum % 11)) % 11;
  return r === 10 ? 'X' : String(r);
}
function isbn13Check(s) {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += +s[i] * (i % 2 === 0 ? 1 : 3);
  return (sum + +s[12]) % 10 === 0;
}
function isbn13Expected(first12) {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += +first12[i] * (i % 2 === 0 ? 1 : 3);
  return String((10 - (sum % 10)) % 10);
}
function to13(s10) {
  // replace prefix 978, recompute check
  const core = '978' + s10.slice(0, 9);
  return core + isbn13Expected(core);
}
function to10(s13) {
  if (!/^978/.test(s13)) return null; // 979 has no direct ISBN-10 equivalent
  const core = s13.slice(3, 12);
  return core + isbn10Expected(core);
}
function hyphenate(s) {
  // crude hyphenation: 3-1-...-1 grouping (registration group varies)
  if (s.length === 13) return `${s.slice(0,3)}-${s.slice(3,4)}-${s.slice(4,8)}-${s.slice(8,12)}-${s.slice(12)}`;
  return `${s.slice(0,1)}-${s.slice(1,5)}-${s.slice(5,9)}-${s.slice(9)}`;
}

module.exports = { routeIsbn };
