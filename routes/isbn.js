// /isbn — validate and convert ISBN-10 <-> ISBN-13, with book info lookup
function isbn10Checksum(d) {
  // d: first 9 digits; returns check char
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (10 - i) * parseInt(d[i], 10);
  const r = (11 - (sum % 11)) % 11;
  return r === 10 ? 'X' : String(r);
}
function isbn13Checksum(d) {
  // d: first 12 digits
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += (i % 2 === 0 ? 1 : 3) * parseInt(d[i], 10);
  return String((10 - (sum % 10)) % 10);
}

function routeIsbn(u, res, json, body, isPost) {
  const raw = u.searchParams.get('q') || u.searchParams.get('isbn');
  if (!isPost && !raw) {
    return json(res, 200, {
      op: 'isbn',
      description: 'Validate ISBN-10/ISBN-13 and convert between them.',
      usage: '/isbn?q=9780306406157 or /isbn?q=0-306-40615-2',
      modes: 'default: validate + convert; ?info=1 to also fetch book metadata from OpenLibrary (may be slow)',
    });
  }
  if (!raw) return json(res, 400, { error: 'Provide ?q=' });
  const digits = String(raw).replace(/[^0-9Xx]/g, '').toUpperCase();
  if (digits.length === 10) {
    const body9 = digits.slice(0, 9);
    if (!/^\d{9}$/.test(body9)) return json(res, 400, { error: 'ISBN-10 must have 9 digits before check char' });
    const expected = isbn10Checksum(body9);
    const valid = digits[9] === expected;
    const out = {
      input: String(raw),
      type: 'ISBN-10',
      valid,
      expectedCheckDigit: expected,
      isbn13: '978' + body9 + isbn13Checksum('978' + body9),
    };
    if (valid && (u.searchParams.get('info') === '1')) {
      return lookupOpenLibrary(out.isbn13, out, res, json);
    }
    return json(res, 200, out);
  }
  if (digits.length === 13) {
    const body12 = digits.slice(0, 12);
    if (!/^\d{12}$/.test(body12)) return json(res, 400, { error: 'ISBN-13 must be all digits' });
    if (!/^97[89]/.test(body12)) return json(res, 400, { error: 'ISBN-13 must start with 978 or 979' });
    const expected = isbn13Checksum(body12);
    const valid = digits[12] === expected;
    const out = {
      input: String(raw),
      type: 'ISBN-13',
      valid,
      expectedCheckDigit: expected,
    };
    if (body12.startsWith('978')) {
      const nine = body12.slice(3);
      const c10 = isbn10Checksum(nine);
      out.isbn10 = nine + c10;
    }
    if (valid && (u.searchParams.get('info') === '1')) {
      return lookupOpenLibrary(digits, out, res, json);
    }
    return json(res, 200, out);
  }
  return json(res, 400, { error: 'Not 10 or 13 digits after stripping hyphens/spaces' });
}

function lookupOpenLibrary(isbn13, out, res, json) {
  const https = require('https');
  const req = https.get(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn13}&format=json&jscmd=data`, (r) => {
    let data = '';
    r.on('data', (c) => data += c);
    r.on('end', () => {
      try {
        const j = JSON.parse(data);
        const b = j[`ISBN:${isbn13}`];
        if (b) {
          out.title = b.title;
          out.authors = (b.authors || []).map(a => a.name);
          out.publishers = (b.publishers || []).map(p => p.name);
          out.publishDate = b.publish_date;
          out.pages = b.number_of_pages;
          if (b.cover) out.coverUrl = b.cover.medium || b.cover.large;
        } else {
          out.openLibrary = 'not found';
        }
      } catch { out.openLibrary = 'lookup failed'; }
      json(res, 200, out);
    });
  });
  req.on('error', () => { out.openLibrary = 'lookup failed'; json(res, 200, out); });
  req.setTimeout(5000, () => { req.destroy(); out.openLibrary = 'timeout'; json(res, 200, out); });
}

module.exports = { routeIsbn };
