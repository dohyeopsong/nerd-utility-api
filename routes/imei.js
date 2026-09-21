// /imei?number=356938035643809 → IMEI validator (Luhn) + TAC/FAC/serial decode, IMEISV support
function routeImei(u, res, json) {
  const raw = u.searchParams.get('number') || u.searchParams.get('imei') || u.searchParams.get('value');
  if (!raw) return json(res, 400, { error: 'pass number=<15-digit IMEI> or 16-digit IMEISV' });
  const num = raw.replace(/[\s-]/g, '');
  if (!/^\d{15}$|^\d{16}$/.test(num)) return json(res, 400, { error: 'must be 15 (IMEI) or 16 (IMEISV) digits' });
  const isSv = num.length === 16;

  let valid = null, checkDigit = null, expected = null;
  if (!isSv) {
    // Luhn over first 14, check digit = position 15
    let sum = 0;
    for (let i = 0; i < 14; i++) {
      let d = +num[i];
      if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
    }
    expected = (10 - (sum % 10)) % 10;
    checkDigit = +num[14];
    valid = expected === checkDigit;
  }

  return json(res, 200, {
    imei: num,
    type: isSv ? 'IMEISV (software version, no check digit)' : 'IMEI',
    valid: isSv ? null : valid,
    checkDigit: isSv ? null : checkDigit,
    expectedCheckDigit: isSv ? null : expected,
    reportingBodyIdentifier: +num.slice(0, 2), // 01/35 = BABT (UK), 86 = TAF China, etc.
    tac: num.slice(0, 8),
    fac: num.slice(8, 10) !== '' ? num.slice(8, 10) : null,
    serialNumber: num.slice(10, isSv ? 15 : 14),
    softwareVersion: isSv ? num.slice(14) : null,
    note: 'TAC identifies the device model. Valid Luhn does not mean the device exists on a network.'
  });
}
module.exports = { routeImei };
