// /imei — IMEI validation (15 digits, Luhn check) and IMEISV (16 digits, no check digit)
function routeImei(u, res, json) {
  const p = u.searchParams;
  const raw = (p.get('imei') || p.get('i') || '').trim().replace(/[\s-]/g, '');
  const imei = raw;

  if (!imei) {
    return json(res, 200, { usage: '?imei=490154203237518 (15 digits; IMEISV 16 digits also accepted)' });
  }

  if (!/^\d{15,16}$/.test(imei)) {
    return json(res, 400, { imei: raw, error: 'IMEI must be 15 digits (or 16 for IMEISV)' });
  }

  // IMEISV: 16 digits, no check digit, last 2 = software version
  if (imei.length === 16) {
    return json(res, 200, {
      imeisv: imei,
      type: 'IMEISV',
      tac: imei.slice(0, 8),
      reportingBodyIdentifier: imei.slice(0, 2),
      serial: imei.slice(8, 14),
      softwareVersion: imei.slice(14),
      note: 'IMEISV has no check digit'
    });
  }

  // Luhn on first 14 digits, check digit = last
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let d = parseInt(imei[i], 10);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  const expected = (10 - (sum % 10)) % 10;

  return json(res, 200, {
    imei,
    type: 'IMEI',
    valid: parseInt(imei[14], 10) === expected,
    checkDigit: parseInt(imei[14], 10),
    expectedCheckDigit: expected,
    tac: imei.slice(0, 8),
    reportingBodyIdentifier: imei.slice(0, 2),
    serial: imei.slice(8, 14)
  });
}

module.exports = { routeImei };
