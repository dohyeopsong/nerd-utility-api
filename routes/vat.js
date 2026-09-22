// /vat — European VAT number validation (structure + country rules, best-effort)
const RULES = {
  AT: { re: /^U\d{8}$/ }, BE: { re: /^\d{10}$/ }, BG: { re: /^\d{9,10}$/ }, CY: { re: /^\d{8}[A-Z]$/ },
  CZ: { re: /^\d{8,10}$/ }, DE: { re: /^\d{9}$/ }, DK: { re: /^\d{8}$/ }, EE: { re: /^\d{9}$/ },
  EL: { re: /^\d{9}$/ }, ES: { re: /^[0-9A-Z][0-9]{7}[0-9A-Z]$/ }, FI: { re: /^\d{8}$/ },
  FR: { re: /^[0-9A-Z]{2}\d{9}$/ }, GB: { re: /^\d{9}$|^\d{12}$|^(GD|HA)\d{3}$/ }, HR: { re: /^\d{11}$/ },
  HU: { re: /^\d{8}$/ }, IE: { re: /^(\d{7}[A-W]{1,2}|\d[A-Z]\d{5}[A-W])$/ }, IT: { re: /^\d{11}$/ },
  LT: { re: /^(\d{9}|\d{12})$/ }, LU: { re: /^\d{8}$/ }, LV: { re: /^\d{11}$/ }, MT: { re: /^\d{8}$/ },
  NL: { re: /^\d{9}B\d{2}$/ }, PL: { re: /^\d{10}$/ }, PT: { re: /^\d{9}$/ }, RO: { re: /^\d{2,10}$/ },
  SE: { re: /^\d{10}$/ }, SI: { re: /^\d{8}$/ }, SK: { re: /^\d{10}$/ }
};

function mod97num(digits) {
  let rem = 0;
  for (const ch of digits) rem = (rem * 10 + Number(ch)) % 97;
  return rem;
}

function routeVat(u, res, json) {
  const q = u.searchParams;
  const raw = (q.get('check') || '').replace(/[\s.-]/g, '').toUpperCase();
  if (!raw) return json(res, 400, { error: 'provide ?check=DE123456789', example: '/vat?check=DE 123 456 789' });

  const out = { input: raw };
  const cc = raw.slice(0, 2);

  if (!/^[A-Z]{2}/.test(cc)) {
    out.valid = false; out.reason = 'missing 2-letter country prefix';
    return json(res, 200, out);
  }
  out.country = cc;
  const body = raw.slice(2);
  out.vat_number = body;

  if (!(cc in RULES)) {
    out.valid = false; out.reason = `unsupported country code: ${cc}`;
    out.supported_countries = Object.keys(RULES).length;
    return json(res, 200, out);
  }

  const rule = RULES[cc];
  if (!rule.re.test(body)) {
    out.valid = false; out.reason = `format invalid for ${cc} (expected pattern ${rule.re})`;
    return json(res, 200, out);
  }

  // checksums for countries with well-known check digit schemes
  if (cc === 'DE') {
    // mod 11 check digit scheme (ISO 7064 MOD 11,10)
    let prod = 10, sum = 0;
    for (const ch of body.slice(0, 8)) {
      sum = (Number(ch) + prod) % 10;
      if (sum === 0) sum = 10;
      prod = (2 * sum) % 11;
    }
    const check = (11 - prod) % 10;
    if (check === Number(body[8])) out.checksum = 'passed (mod 11,10)';
    else {
      out.valid = false; out.reason = `check digit failed (expected ${check}, got ${body[8]})`;
      return json(res, 200, out);
    }
  }
  if (cc === 'NL') {
    const digits = body.slice(0, 9);
    const weights = [9, 8, 7, 6, 5, 4, 3, 2, -1];
    const sum = digits.split('').reduce((s, d, i) => s + Number(d) * weights[i], 0);
    if (sum % 11 !== 0) { out.valid = false; out.reason = 'mod 11 checksum failed'; return json(res, 200, out); }
    out.checksum = 'passed (mod 11)';
  }

  out.valid = true;
  out.note = 'structural validation only — full validation requires the VIES service (https://ec.europa.eu/taxation_customs/vies/)';
  return json(res, 200, out);
}

module.exports = { routeVat };
