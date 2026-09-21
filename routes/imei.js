// IMEI/IMEISV validator: Luhn check, TAC/FAC decode
function clean(s) { return String(s).replace(/[\s.-]/g, ''); }
function luhn(d) {
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let x = +d[i];
    if (i % 2 === 1) { x *= 2; if (x > 9) x -= 9; }
    sum += x;
  }
  return sum % 10 === 0;
}
function routeImei(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  const input = q.imei || q.number;
  if (!input) return json(res, 400, { error: 'provide ?imei=<15-digit IMEI or 16-digit IMEISV>' });
  const c = clean(input);
  if (!/^\d{15}|\d{16}$/.test(c)) return json(res, 400, { error: 'IMEI must be 15 digits (or 16 for IMEISV)' });
  const imeisv = c.length === 16;
  const body = c.slice(0, 14); // first 14 digits
  const luhnDigit = String((10 - (body.split('').reduce((s, d, i) => { let x = +d; if (i % 2 === 1) { x *= 2; if (x > 9) x -= 9; } return s + x; }, 0) * 0) % 10) % 10);
  // proper check digit:
  let sum = 0;
  for (let i = 0; i < 14; i++) { let x = +body[i]; if (i % 2 === 1) { x *= 2; if (x > 9) x -= 9; } sum += x; }
  const check = (10 - (sum % 10)) % 10;
  const valid = imeisv ? true : +c[14] === check; // IMEISV has no check digit
  return json(res, 200, {
    input, normalized: c,
    type: imeisv ? 'IMEISV' : 'IMEI',
    valid,
    reportBodyIdentifier: c.slice(0, 2),
    tac: c.slice(0, 8),
    fac: c.slice(8, 10),
    serial: c.slice(10, 14),
    checkDigit: imeisv ? null : +c[14],
    svn: imeisv ? c.slice(14, 16) : null,
    luhnValid: imeisv ? null : valid
  });
}
module.exports = { routeImei };
