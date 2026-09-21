// EAN/UPC barcode validator: EAN-8, EAN-13, UPC-A, UPC-E expansion
function checksum(d) { // d: digits without check digit
  let sum = 0;
  for (let i = d.length - 1, w = 3; i >= 0; i--, w = w === 3 ? 1 : 3) sum += (+d[i]) * w;
  return (10 - (sum % 10)) % 10;
}
function expandUpcE(e) {
  const p = e[0], l = e.slice(1, 6), m = e[6];
  let base;
  if (m === '0' || m === '1' || m === '2') base = p + l.slice(0,2) + m + '0000' + l.slice(2,5);
  else if (m === '3') base = p + l.slice(0,3) + '00000' + l.slice(3,5);
  else if (m === '4') base = p + l.slice(0,4) + '00000' + l.slice(4,5);
  else base = p + l.slice(0,5) + '0000' + m;
  return base + checksum(base);
}
function validate(input) {
  const d = String(input || '').replace(/[\s-]/g, '');
  if (!/^\d+$/.test(d)) return { error: 'barcode must contain digits only' };
  if (![8, 12, 13].includes(d.length)) return { error: `length must be 8 (EAN-8), 12 (UPC-A), or 13 (EAN-13), got ${d.length}` };
  const out = { barcode: d };
  let type, body, check;
  if (d.length === 13) { type = 'EAN-13'; body = d.slice(0, 12); check = +d[12]; }
  else if (d.length === 12) { type = 'UPC-A'; body = d.slice(0, 11); check = +d[11]; }
  else { type = 'EAN-8'; body = d.slice(0, 7); check = +d[7]; }
  out.type = type;
  out.checkDigitProvided = check;
  out.checkDigitExpected = checksum(body);
  out.checksumValid = check === out.checkDigitExpected;
  if (type === 'EAN-13') { out.countryPrefix = gs1Prefix(body.slice(0, 3)); out.companyPrefix = body.slice(3, 7); out.productCode = body.slice(7, 12); }
  if (type === 'UPC-A') { out.numberSystem = body[0]; out.manufacturer = body.slice(1, 6); out.product = body.slice(6, 11); }
  if (type === 'EAN-8') { out.prefix = body.slice(0, 3); out.item = body.slice(3, 7); }
  out.valid = out.checksumValid;
  if (!out.valid) out.reason = `check digit mismatch: expected ${out.checkDigitExpected}, got ${check}`;
  return out;
}
function gs1Prefix(p) {
  const n = +p;
  if (p[0] === '0') return 'UPC-A (US/Canada)';
  if (p[0] === '1') return 'UPC-A (US/Canada)';
  if (n >= 30 && n <= 37) return 'France';
  if (n >= 40 && n <= 44) return 'Distribution (restricted)';
  if (n >= 45 && n <= 49) return 'Japan';
  if (n >= 50 && n <= 59) return 'Coupons';
  if (n >= 60 && n <= 64) return 'US (new)';
  if (n === 76 || n === 77) return 'Switzerland';
  if (n >= 380 && n <= 380) return 'Bulgaria';
  if (n === 590) return 'Poland';
  if (n >= 600 && n <= 601) return 'South Africa';
  if (n === 690 || n === 691) return 'China';
  if (n === 622 || n === 621) return 'Egypt / Saudi Arabia region';
  if (n >= 740 && n <= 745) return 'Central America';
  if (n >= 850 && n <= 858) return 'Slovakia/Czech region';
  if (n >= 870 && n <= 879) return 'Netherlands';
  if (n >= 900 && n <= 919) return 'Austria';
  if (n >= 930 && n <= 939) return 'Australia';
  if (n >= 977) return 'ISSN (periodicals)';
  if (n >= 978 && n <= 979) return 'ISBN (books)';
  if (n === 980) return 'Refund receipts';
  return `GS1 prefix ${p}`;
}
function routeEan(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  if (q.upcE) {
    const e = q.upcE.replace(/\D/g, '');
    if (e.length !== 8) return json(res, 400, { error: 'UPC-E must be 8 digits (including check digit)' });
    return json(res, 200, { upcE: e, expandedUpcA: expandUpcE(e) });
  }
  if (!q.code) return json(res, 400, { error: 'missing ?code= parameter' });
  return json(res, 200, validate(q.code));
}
module.exports = { routeEan, validate, expandUpcE };
