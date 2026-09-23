// /cusip — validate CUSIP security identifiers (9-char, base-36 checksum)
const W = [1, 2, 1, 2, 1, 2, 1, 2];

function charVal(c) {
  if (/[0-9]/.test(c)) return +c;
  return c.charCodeAt(0) - 'A'.charCodeAt(0) + 10; // A=10 ... Z=35
}

function routeCusip(u, res, json) {
  const p = u.searchParams;

  const partial = p.get('partial');
  if (partial) {
    const s = partial.toUpperCase().replace(/\s/g, '');
    if (!/^[0-9A-Z]{8}$/.test(s)) return json(res, 400, { error: 'partial must be 8 chars of digits or A-Z' });
    let sum = 0;
    for (let i = 0; i < 8; i++) {
      let v = charVal(s[i]) * W[i];
      if (v > 9) sum += Math.floor(v / 10) + (v % 10); else sum += v;
    }
    const check = (10 - (sum % 10)) % 10;
    return json(res, 200, { partial: s, checkDigit: String(check), complete: s + check });
  }

  const code = (p.get('code') || p.get('c') || '').toUpperCase().replace(/\s/g, '');
  if (!code) {
    return json(res, 200, { usage: '?code=037833100 (validate Apple CUSIP) | ?partial=03783310 (compute check digit)' });
  }
  if (!/^[0-9A-Z]{9}$/.test(code)) {
    return json(res, 400, { error: 'CUSIP is 9 chars: digits or A-Z, last char is check digit' });
  }

  let sum = 0;
  for (let i = 0; i < 8; i++) {
    let v = charVal(code[i]) * W[i];
    if (v > 9) sum += Math.floor(v / 10) + (v % 10); else sum += v;
  }
  const check = (10 - (sum % 10)) % 10;
  const valid = check === charVal(code[8]);
  return json(res, 200, { code, valid, issuer: code.slice(0, 6), issue: code[6], checkDigit: code[8] });
}

module.exports = { routeCusip };
