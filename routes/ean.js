// EAN-8 / EAN-13 / UPC-A barcode validator with checksum
function validateEAN(input) {
  const code = String(input).replace(/[\s-]/g, '');
  if (!/^\d+$/.test(code)) return { valid: false, reason: 'digits only' };
  const checkDigit = +code[code.length - 1];
  let sum = 0, format = null;
  if (code.length === 13) {
    format = 'EAN-13';
    for (let i = 0; i < 12; i++) sum += +code[i] * (i % 2 === 0 ? 1 : 3);
  } else if (code.length === 8) {
    format = 'EAN-8';
    for (let i = 0; i < 7; i++) sum += +code[i] * (i % 2 === 0 ? 3 : 1);
  } else if (code.length === 12) {
    format = 'UPC-A';
    for (let i = 0; i < 11; i++) sum += +code[i] * (i % 2 === 0 ? 3 : 1);
  } else if (code.length === 6) {
    format = 'UPC-E(6)';
    const d = expandUPCE(code);
    return { input: code, format: 'UPC-E', valid: validateEAN(d).valid, expanded: d, note: 'expanded to UPC-A' };
  } else {
    return { valid: false, reason: 'expected 8, 12, or 13 digits (got ' + code.length + ')' };
  }
  const expected = (10 - (sum % 10)) % 10;
  return { input: code, format, valid: checkDigit === expected, checkDigit, computedCheck: expected, sum };
}
function expandUPCE(e6) {
  // UPC-E expansion rules per GS1
  const d = e6.slice(0, 6), last = e6[5];
  let m;
  if (last === '0' || last === '1' || last === '2') m = d.slice(0,5) + last + '0000' + d[5];
  else if (last === '3') m = d.slice(0,6) + '00000' + d[5];
  else if (last === '4') m = d.slice(0,7) + '00000' + d[5];
  else m = d.slice(0,6) + '0000' + last + d[5];
  return '0' + m; // NSCI 0
}
function routeEan(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  if (!q.code) return json(res, 400, { error: 'provide ?code=<EAN/UPC digits>' });
  return json(res, 200, validateEAN(q.code));
}
module.exports = { routeEan, validateEAN };
