// /iban — IBAN validation + parsing (mod-97 checksum, country rules for common countries)
const COUNTRY_RULES = {
  AL: 28, AD: 24, AT: 20, AZ: 28, BH: 22, BE: 16, BA: 20, BR: 29, BG: 22, HR: 21,
  CY: 28, CZ: 24, DK: 18, DO: 28, EE: 20, FO: 18, FI: 18, FR: 27, GE: 22, DE: 22,
  GI: 23, GR: 27, GL: 18, GT: 28, HU: 28, IS: 26, IE: 22, IL: 23, IT: 27, JO: 30,
  KZ: 20, KW: 30, LV: 21, LB: 28, LI: 21, LT: 20, LU: 20, MK: 19, MT: 31, MR: 27,
  MU: 30, MD: 24, MC: 27, ME: 22, NL: 18, NO: 15, PK: 24, PS: 29, PL: 28, PT: 25,
  QA: 29, RO: 24, SM: 27, SA: 24, RS: 22, SK: 24, SI: 19, ES: 24, SE: 24, CH: 21,
  TN: 24, TR: 26, AE: 23, GB: 22, VG: 24
};

function mod97(str) {
  let rem = 0;
  for (const ch of str) {
    rem = (rem * 10 + parseInt(ch, 36 > 36 ? 36 : 36)) % 97;
  }
  return rem;
}

// proper implementation: rearrange + convert letters to numbers, then mod 97
function ibanMod97(iban) {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, c => (c.charCodeAt(0) - 55).toString());
  let rem = 0;
  for (const ch of numeric) rem = (rem * 10 + Number(ch)) % 97;
  return rem;
}

function routeIban(u, res, json) {
  const q = u.searchParams;
  const raw = (q.get('check') || '').replace(/\s+/g, '').toUpperCase();
  if (!raw) return json(res, 400, { error: 'provide ?check=DE89370400440532013000', example: '/iban?check=DE89 3704 0044 0532 0130 00' });

  const out = { input: raw };
  const cc = raw.slice(0, 2);

  // structure checks
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(raw)) {
    out.valid = false; out.reason = 'malformed structure (expect country code + check digits + BBAN)';
    return json(res, 200, out);
  }
  out.country = cc;
  out.check_digits = raw.slice(2, 4);
  out.bban = raw.slice(4);

  if (!(cc in COUNTRY_RULES)) {
    out.valid = false; out.reason = `unknown/unsupported country code: ${cc}`;
    out.supported_countries = Object.keys(COUNTRY_RULES).length;
    return json(res, 200, out);
  }

  out.expected_length = COUNTRY_RULES[cc];
  if (raw.length !== COUNTRY_RULES[cc]) {
    out.valid = false; out.reason = `length ${raw.length} invalid for ${cc} (expected ${COUNTRY_RULES[cc]})`;
    return json(res, 200, out);
  }

  // checksum
  out.valid = ibanMod97(raw) === 1;
  if (!out.valid) out.reason = 'mod-97 checksum failed';

  // BBAN details for a few countries (best effort)
  if (cc === 'DE') out.bank_code = raw.slice(4, 12), out.account_number = raw.slice(12);
  if (cc === 'GB') out.sort_code = raw.slice(8, 14), out.account_number = raw.slice(14);
  if (cc === 'FR') out.bank_code = raw.slice(4, 9), out.branch = raw.slice(9, 14), out.account = raw.slice(14, 25);

  out.formatted = raw.replace(/(.{4})/g, '$1 ').trim();
  return json(res, 200, out);
}

module.exports = { routeIban };
