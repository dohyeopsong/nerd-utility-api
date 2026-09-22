// /isbn — ISBN-10/13 validation, check-digit computation, and 10↔13 conversion
function isbn10Check(numStr) {
  // sum of (10-i)*digit, valid if sum % 11 == 0; 'X' allowed as last digit = 10
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const c = numStr[i];
    let d;
    if (c === 'X' || c === 'x') {
      if (i !== 9) return false;
      d = 10;
    } else {
      d = c.charCodeAt(0) - 48;
      if (d < 0 || d > 9) return false;
    }
    sum += (10 - i) * d;
  }
  return sum % 11 === 0;
}
function isbn10CheckDigit(first9) {
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const d = first9.charCodeAt(i) - 48;
    if (d < 0 || d > 9) return null;
    sum += (10 - i) * d;
  }
  const r = (11 - (sum % 11)) % 11;
  return r === 10 ? 'X' : String(r);
}
function isbn13Check(numStr) {
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    const d = numStr.charCodeAt(i) - 48;
    if (d < 0 || d > 9) return false;
    sum += (i % 2 === 0 ? 1 : 3) * d;
  }
  return sum % 10 === 0;
}
function isbn13CheckDigit(first12) {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = first12.charCodeAt(i) - 48;
    if (d < 0 || d > 9) return null;
    sum += (i % 2 === 0 ? 1 : 3) * d;
  }
  return String((10 - (sum % 10)) % 10);
}
function routeIsbn(u, res, json) {
  const q = u.searchParams;
  const raw = q.get('isbn') || q.get('number') || '';
  const num = raw.replace(/[\s-]/g, '');
  if (!num) return json(res, 400, { error: 'isbn required' });
  const result = { input: raw };
  if (num.length === 10) {
    result.type = 'isbn10';
    result.valid = isbn10Check(num);
    if (!/^\d{9}[\dXx]$/.test(num)) { result.valid = false; result.reason = 'invalid characters'; }
    // convert to ISBN-13: prefix 978 + first 9 + new check digit
    const base = '978' + num.slice(0, 9);
    result.isbn13 = base + isbn13CheckDigit(base);
  } else if (num.length === 13) {
    result.type = 'isbn13';
    result.valid = isbn13Check(num);
    if (!/^\d{13}$/.test(num)) { result.valid = false; result.reason = 'invalid characters'; }
    result.prefix = num.slice(0, 3);
    result.registration_group = num.slice(3, 4); // simplified
    // convert to ISBN-10 (only for 978 prefix)
    if (num.startsWith('978')) {
      const base = num.slice(3, 12);
      result.isbn10 = base + isbn10CheckDigit(base);
    }
  } else {
    return json(res, 400, { error: 'isbn must be 10 or 13 digits' });
  }
  return json(res, 200, result);
}
module.exports = { routeIsbn };
