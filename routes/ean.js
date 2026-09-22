// /ean — EAN-8/EAN-13/UPC-A checksum validation + check-digit computation
function routeEan(u, res, json) {
  const q = u.searchParams;
  const compute = q.get('compute');
  const check = q.get('check');

  if (compute !== null) {
    const s = compute.replace(/[\s-]/g, '');
    if (!/^\d+$/.test(s)) return json(res, 400, { error: 'digits only' });
    if (s.length !== 7 && s.length !== 12 && s.length !== 11)
      return json(res, 400, { error: 'compute accepts 7 (EAN-8), 11 (UPC-A), or 12 (EAN-13) digits' });
    return json(res, 200, { input: s, check_digit: eanCheckDigit(s), complete: s + eanCheckDigit(s) });
  }
  if (check !== null) {
    const s = check.replace(/[\s-]/g, '');
    if (!/^\d+$/.test(s)) return json(res, 400, { error: 'digits only' });
    const out = { input: s };
    if (s.length === 8) out.type = 'EAN-8';
    else if (s.length === 12) out.type = 'UPC-A';
    else if (s.length === 13) out.type = 'EAN-13';
    else { out.valid = false; out.reason = 'length must be 8, 12, or 13'; return json(res, 200, out); }
    const partial = s.slice(0, -1);
    const expected = eanCheckDigit(partial);
    out.check_digit = s.slice(-1);
    out.expected_check_digit = expected;
    out.valid = expected === out.check_digit;
    return json(res, 200, out);
  }
  return json(res, 400, { error: 'provide ?check=CODE or ?compute=PARTIAL', examples: ['/ean?check=4006381333931', '/ean?compute=400638133393'] });
}

// EAN-13: weights 1,3,1,3... from left (weight of last data digit is 3)
// UPC-A (12): effectively EAN-13 with leading 0 -> weights 3,1,3,1... from left
// EAN-8: weights 3,1,3,1... from left
function eanCheckDigit(partial) {
  const n = partial.length;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    // EAN-13/UPC-A/EAN-8: weight of position i (0-indexed from left, data digits)
    // For 12-digit partial (EAN-13): weights 1,3,1,3...
    // For 11-digit partial (UPC-A): weights 3,1,3,1...
    // For 7-digit partial (EAN-8): weights 3,1,3,1...
    let w;
    if (n === 12) w = i % 2 === 0 ? 1 : 3;
    else w = i % 2 === 0 ? 3 : 1;
    sum += +partial[i] * w;
  }
  return String((10 - (sum % 10)) % 10);
}

module.exports = { routeEan };
