// IMEI/IMEISV validator: Luhn check + TAC/FAC/serial decode
function validate(input) {
  const d = String(input || '').replace(/[\s-]/g, '');
  if (!/^\d+$/.test(d)) return { error: 'IMEI must contain digits only (spaces/dashes stripped)' };
  if (d.length !== 15 && d.length !== 16) return { error: `IMEI must be 15 digits (IMEI) or 16 digits (IMEISV), got ${d.length}` };
  const out = { imei: d, type: d.length === 15 ? 'IMEI' : 'IMEISV' };
  out.tac = d.slice(0, 8);          // Type Allocation Code
  out.reportingBodyIdentifier = TAC_RBI(d.slice(0,2));
  out.fac = d.slice(8, 10);          // Final Assembly Code (legacy)
  out.serial = d.slice(10, 14);
  if (d.length === 15) {
    out.checkDigit = +d[14];
    out.checkDigitProvided = +d[14];
    let sum = 0, dbl = false;
    for (let i = 13; i >= 0; i--) { let x = +d[i]; if (dbl) { x *= 2; if (x > 9) x -= 9; } sum += x; dbl = !dbl; }
    const expected = (10 - (sum % 10)) % 10;
    out.luhnValid = expected === +d[14];
    out.expectedCheckDigit = expected;
    out.valid = out.luhnValid;
  } else {
    out.svn = d.slice(14);           // software version number (IMEISV has no check digit)
    out.valid = true;
    out.note = 'IMEISV (16 digits) has no check digit';
  }
  return out;
}
function TAC_RBI(first2) {
  const rbi = +first2;
  if (rbi === 1) return 'PTCRB (North America)';
  if (rbi === 0) return 'Early reporting bodies';
  if (rbi === 35) return 'BABT (UK)';
  if (rbi === 86) return 'TAF (China)';
  return `reporting body identifier ${first2}`;
}
function routeImei(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  if (!q.imei) return json(res, 400, { error: 'missing ?imei= parameter' });
  return json(res, 200, validate(q.imei));
}
module.exports = { routeImei, validate };
