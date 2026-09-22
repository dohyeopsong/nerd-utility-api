// /imei — IMEI/IMEISV validation: 15-digit IMEI with Luhn check, 16-digit IMEISV, TAC reporting
function luhnCheck(digits) {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[i]);
    // IMEI doubles every second digit from the right (positions 2,4,...)
    // For a 15-digit IMEI, positions (0-indexed from left) 1,3,5,7,9,11,13 are doubled
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

function routeImei(u, res, json) {
  const q = u.searchParams;
  const raw = (q.get('check') || '').replace(/[\s-]/g, '');
  if (!raw) {
    return json(res, 400, {
      error: 'provide ?check=356938035643809',
      example: '/imei?check=490154203237518',
      note: 'accepts 15-digit IMEI or 16-digit IMEISV'
    });
  }

  const out = { input: raw };

  if (!/^\d{15,16}$/.test(raw)) {
    out.valid = false;
    out.reason = `expected 15 (IMEI) or 16 (IMEISV) digits, got ${raw.replace(/\D/g, '').length} digits / non-numeric input`;
    return json(res, 200, out);
  }

  out.type = raw.length === 15 ? 'IMEI' : 'IMEISV';

  if (raw.length === 16) {
    // IMEISV: 14 digits + 2-digit SVN, no Luhn check digit (SVN is software version)
    out.tac = raw.slice(0, 8);
    out.serial = raw.slice(8, 14);
    out.svn = raw.slice(14);
    out.check_digit = null;
    // TAC: first 8 digits; first 2 = reporting body identifier
    out.reporting_body_identifier = raw.slice(0, 2);
    out.valid = true; // structure valid; no checksum defined for IMEISV
    out.note = 'IMEISV has no check digit (last 2 digits are SVN); structural validation only';
    return json(res, 200, out);
  }

  // 15-digit IMEI
  out.tac = raw.slice(0, 8);
  out.reporting_body_identifier = raw.slice(0, 2);
  out.serial = raw.slice(8, 14);
  const checkDigit = Number(raw[14]);
  out.check_digit = checkDigit;

  if (!luhnCheck(raw)) {
    out.valid = false;
    out.reason = 'Luhn check failed — not a valid IMEI';
    return json(res, 200, out);
  }

  out.valid = true;
  out.note = 'Luhn checksum passed. TAC identifies device model (lookup requires external database)';
  return json(res, 200, out);
}

module.exports = { routeImei };
