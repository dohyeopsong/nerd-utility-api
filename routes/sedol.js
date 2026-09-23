// /sedol — UK/NASDAQ SEDOL security identifier validation
const W = [1, 3, 1, 7, 3, 9, 1];
function routeSedol(u, res, json) {
  const p = u.searchParams;
  const raw = (p.get('sedol') || p.get('code') || '').trim();
  if (!raw) return json(res, 200, { usage: '?sedol=B0YBKJ7 — validate & parse a 7-char SEDOL (6 chars + Luhn-style check digit)' });
  const s = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (s.length !== 7) return json(res, 400, { valid: false, error: `SEDOL must be 7 alphanumeric chars, got ${s.length}` });
  if (/[AEIOU]/.test(s)) return json(res, 400, { valid: false, error: 'SEDOL never contains vowels (A E I O U)' });
  const body = s.slice(0, 6), given = s[6];
  const v = ch => ch <= '9' ? +ch : ch.charCodeAt(0) - 55; // A=10..Z=35
  const sum = body.split('').reduce((a, ch, i) => a + v(ch) * W[i], 0);
  const expected = String((10 - (sum % 10)) % 10);
  return json(res, 200, {
    valid: given === expected,
    sedol: s,
    identifier: body,
    check_digit_given: given,
    check_digit_expected: expected,
    error: given === expected ? undefined : 'checksum mismatch',
  });
}
module.exports = { routeSedol };
