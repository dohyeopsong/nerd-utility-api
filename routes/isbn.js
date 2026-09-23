// /isbn — ISBN-10 / ISBN-13 validation, checksum digit computation, and conversion
function isbn10Checksum(d) { // d: 9 digits -> check char
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (10 - i) * d[i];
  const rem = (11 - (sum % 11)) % 11;
  return rem === 10 ? 'X' : String(rem);
}
function isbn13Checksum(d) { // d: 12 digits -> check digit
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += d[i] * (i % 2 ? 3 : 1);
  return String((10 - (sum % 10)) % 10);
}

function routeIsbn(u, res, json, body, isPost) {
  const q = u.searchParams.get('q');
  const mode = u.searchParams.get('mode') || 'validate'; // validate | convert
  if (!isPost && !q) {
    return json(res, 200, {
      op: 'isbn',
      description: 'Validate ISBN-10/ISBN-13, or convert between formats.',
      usage: '/isbn?q=9780306406157 (validate) or /isbn?q=0306406152&mode=convert',
    });
  }
  if (!q) return json(res, 400, { error: 'Provide ?q=' });
  const raw = String(q).trim().replace(/[-\s]/g, '').toUpperCase();

  if (mode === 'convert') {
    if (/^\d{9}[\dX]$/.test(raw)) { // ISBN-10 -> ISBN-13
      const d = [...raw.slice(0, 9)].map(Number);
      if (isbn10Checksum(d) !== raw[9]) return json(res, 400, { error: 'Invalid ISBN-10 checksum' });
      const i13 = [9,7,8, ...d];
      return json(res, 200, { input: raw, isbn13: i13.join('') + isbn13Checksum(i13) });
    }
    if (/^\d{13}$/.test(raw)) { // ISBN-13 -> ISBN-10 (only if 978 prefix)
      if (!raw.startsWith('978')) return json(res, 400, { error: 'Only 978-prefixed ISBN-13 can convert to ISBN-10' });
      const d = [...raw.slice(3, 12)].map(Number);
      if (isbn13Checksum([9,7,8,...d]) !== raw[12]) return json(res, 400, { error: 'Invalid ISBN-13 checksum' });
      return json(res, 200, { input: raw, isbn10: d.join('') + isbn10Checksum(d) });
    }
    return json(res, 400, { error: 'Not a valid ISBN length' });
  }

  // validate
  if (/^\d{9}[\dX]$/.test(raw)) {
    const d = [...raw.slice(0, 9)].map(Number);
    const valid = isbn10Checksum(d) === raw[9];
    return json(res, 200, { input: raw, type: 'ISBN-10', valid, hyphenated: raw.slice(0,1)+'-'+raw.slice(1,4)+'-'+raw.slice(4,9)+'-'+raw.slice(9) });
  }
  if (/^\d{13}$/.test(raw)) {
    const d = [...raw.slice(0, 12)].map(Number);
    const valid = isbn13Checksum(d) === raw[12];
    return json(res, 200, { input: raw, type: 'ISBN-13', valid });
  }
  return json(res, 400, { error: 'Not a valid ISBN length (10 or 13 digits)' });
}

module.exports = { routeIsbn };
