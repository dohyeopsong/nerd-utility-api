// ISBN-10 / ISBN-13 validator with check-digit computation and conversion
function validateISBN(input) {
  const isbn = String(input).replace(/[\s-]/g, '').toUpperCase();
  if (/^\d{9}[\dX]$/.test(isbn)) {
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      const d = isbn[i] === 'X' ? 10 : +isbn[i];
      sum += d * (10 - i);
    }
    return { input: isbn, valid: sum % 11 === 0, format: 'ISBN-10',
      checkDigit: isbn[9], computedCheck: (11 - (sum - (isbn[9]==='X'?10:+isbn[9])*1) % 11) % 11 === (isbn[9]==='X'?10:+isbn[9]) ? isbn[9] : String((11 - ((sum - (isbn[9]==='X'?10:+isbn[9]))) % 11 + 11) % 11),
      sum };
  }
  if (/^\d{13}$/.test(isbn) && (isbn.startsWith('978') || isbn.startsWith('979'))) {
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += +isbn[i] * (i % 2 === 0 ? 1 : 3);
    const expected = (10 - (sum % 10)) % 10;
    return { input: isbn, valid: +isbn[12] === expected, format: 'ISBN-13', checkDigit: isbn[12], computedCheck: String(expected), sum };
  }
  if (/^\d{13}$/.test(isbn)) {
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += +isbn[i] * (i % 2 === 0 ? 1 : 3);
    const expected = (10 - (sum % 10)) % 10;
    return { input: isbn, valid: +isbn[12] === expected, format: 'EAN-13 (not ISBN prefix)', checkDigit: isbn[12], computedCheck: String(expected) };
  }
  return { input: isbn, valid: false, reason: 'expected 10-digit (with optional X) or 13-digit ISBN' };
}
function routeIsbn(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  if (!q.isbn) return json(res, 400, { error: 'provide ?isbn=<ISBN-10 or ISBN-13>' });
  return json(res, 200, validateISBN(q.isbn));
}
module.exports = { routeIsbn, validateISBN };
