// /sedol — SEDOL security identifier validation (7 chars: 6 body + check digit)
const W = [1, 3, 1, 7, 3, 9, 1];
function routeSedol(u, res, json) {
  const p = u.searchParams;
  const input = p.get('sedol') || p.get('s');
  if (!input) return json(res, 200, { usage: '?sedol=B0YBKJ7 — validate a 7-character SEDOL' });
  const s = input.toUpperCase().replace(/[-\s]/g, '');
  if (!/^[0-9B-DF-HJ-NP-TV-Z]{6}[0-9]$/.test(s))
    return json(res, 400, { error: 'SEDOL must be 7 chars: 6 alphanumeric (no vowels) + check digit' });
  const val = (c) => (c >= '0' && c <= '9') ? +c : c.charCodeAt(0) - 55; // A=10..Z=35
  let sum = 0;
  for (let i = 0; i < 7; i++) sum += val(s[i]) * W[i];
  const valid = sum % 10 === 0;
  return json(res, valid ? 200 : 422, {
    sedol: s,
    valid,
    computed_check_digit: String((10 - (sum - val(s[6]) * W[6]) % 10) % 10),
    check_digit: s[6],
  });
}
module.exports = { routeSedol };
