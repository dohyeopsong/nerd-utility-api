// /sedol — validate SEDOL security identifiers (7-char, weighted checksum)
const W = [1, 3, 1, 7, 3, 9, 1];

function routeSedol(u, res, json) {
  const p = u.searchParams;
  const code = (p.get('code') || p.get('c') || '').toUpperCase().replace(/\s/g, '');

  if (!code) {
    return json(res, 200, { usage: '?code=B0YBKJ7 (validate) | ?partial=B0YBKJ (compute check digit)' });
  }

  const partial = p.get('partial');
  if (partial) {
    const s = partial.toUpperCase();
    if (!/^[0-9B-Z]{6}$/.test(s) || s.includes('V')) return json(res, 400, { error: 'partial must be 6 chars of digits or B-Z (no vowels)' });
    const sum = W.slice(0, 6).reduce((a, w, i) => a + w * charVal(s[i]), 0);
    const check = (10 - (sum % 10)) % 10;
    return json(res, 200, { partial, checkDigit: String(check), complete: s + check });
  }

  if (!/^[0-9B-Z]{7}$/.test(code) || code.includes('V')) {
    return json(res, 400, { error: 'SEDOL is 7 chars: digits or B-Z, no vowels, last char is check digit' });
  }

  const sum = W.reduce((a, w, i) => a + w * charVal(code[i]), 0);
  const valid = sum % 10 === 0;
  return json(res, 200, { code, valid, length: code.length });
}

function charVal(c) {
  if (/[0-9]/.test(c)) return +c;
  return c.charCodeAt(0) - 'A'.charCodeAt(0) + 10; // B=11 ... Z=35
}

module.exports = { routeSedol };
