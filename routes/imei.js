// IMEI validator: 15 digits (Luhn check digit), decode TAC/FAC/serial; IMEISV = 16 digits (no check digit)
function luhn15(d14) {
  // compute check digit for first 14 digits
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let n = +d14[i];
    if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
  }
  return (10 - (sum % 10)) % 10;
}
function validate(input) {
  const d = String(input || '').replace(/[\s-]/g, '');
  if (!/^\d+$/.test(d)) return { error: 'IMEI must contain digits only' };
  if (d.length === 15) {
    const expected = luhn15(d.slice(0, 14));
    const out = {
      imei: d,
      type: 'IMEI',
      tac: d.slice(0, 8),        // Type Allocation Code
      fac: d.slice(0, 2),        // Reporting Body Identifier (old FAC)
      snr: d.slice(8, 14),       // serial
      checkDigitProvided: d[14],
      checkDigitExpected: String(expected),
      valid: +d[14] === expected
    };
    if (!out.valid) out.reason = `check digit should be ${expected}`;
    return out;
  }
  if (d.length === 16) {
    return { imei: d, type: 'IMEISV', tac: d.slice(0, 8), snr: d.slice(8, 14), svn: d.slice(14), valid: true, note: 'IMEISV has no check digit (software version number replaces it)' };
  }
  return { error: 'IMEI must be 15 digits (or 16 for IMEISV)' };
}
function routeImei(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  if (!q.imei && !q.n) return json(res, 400, { error: 'missing ?imei= parameter' });
  return json(res, 200, validate(q.imei || q.n));
}
module.exports = { routeImei, validate };
