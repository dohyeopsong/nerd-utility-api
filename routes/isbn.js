// /isbn — ISBN-10/ISBN-13 validation, check digit computation, and conversion
function isbn10Check(partial9) {
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (10 - i) * parseInt(partial9[i], 10);
  const r = (11 - (sum % 11)) % 11;
  return r === 10 ? 'X' : String(r);
}

function isbn13Check(partial12) {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(partial12[i], 10) * (i % 2 === 0 ? 1 : 3);
  return String((10 - (sum % 10)) % 10);
}

function validateIsbn10(raw) {
  const s = raw.replace(/[\s-]/g, '').toUpperCase();
  const out = { input: raw, isbn10: s, valid: false };
  if (!/^[0-9]{9}[0-9X]$/.test(s)) { out.reason = 'ISBN-10 must be 9 digits + check (0-9 or X)'; return out; }
  out.checkDigit = s[9];
  out.expectedCheckDigit = isbn10Check(s.slice(0, 9));
  out.checksumValid = out.checkDigit === out.expectedCheckDigit;
  if (!out.checksumValid) { out.reason = 'ISBN-10 checksum failed'; return out; }
  out.valid = true;
  out.isbn13 = '978' + s.slice(0, 9) + isbn13Check('978' + s.slice(0, 9));
  return out;
}

function validateIsbn13(raw) {
  const s = raw.replace(/[\s-]/g, '');
  const out = { input: raw, isbn13: s, valid: false };
  if (!/^[0-9]{13}$/.test(s)) { out.reason = 'ISBN-13 must be 13 digits'; return out; }
  out.checkDigit = s[12];
  out.expectedCheckDigit = isbn13Check(s.slice(0, 12));
  out.checksumValid = out.checkDigit === out.expectedCheckDigit;
  if (!out.checksumValid) { out.reason = 'ISBN-13 checksum failed'; return out; }
  out.valid = true;
  if (s.startsWith('978') || s.startsWith('979')) {
    // convert to ISBN-10 where possible (only 978)
    if (s.startsWith('978')) {
      const core = s.slice(3, 12);
      out.isbn10 = core + isbn10Check(core);
    }
  }
  return out;
}

function routeIsbn(u, res, json) {
  const q = (u.searchParams.get('isbn') || u.searchParams.get('q') || '').trim();
  if (!q) return json(res, 400, { error: 'missing ?isbn=9780306406157' });
  const s = q.replace(/[\s-]/g, '');
  if (/^[0-9]{13}$/.test(s)) return json(res, 200, validateIsbn13(q));
  if (/^[0-9]{9}[0-9Xx]$/.test(s)) return json(res, 200, validateIsbn10(q));
  return json(res, 400, { error: 'not a valid ISBN-10 or ISBN-13 format' });
}

module.exports = { routeIsbn, validateIsbn10, validateIsbn13 };
