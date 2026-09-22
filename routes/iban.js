// /iban — IBAN validation: mod-97 checksum, per-country length, BBAN structure hint
const IBAN_LENGTHS = {
  AL:28, AD:24, AT:20, AZ:28, BH:22, BE:16, BA:20, BR:29, BG:22, HR:21, CY:28, CZ:24,
  DK:18, DO:28, EE:20, FO:18, FI:18, FR:27, GE:22, DE:22, GI:23, GR:27, GL:18, GT:28,
  HU:28, IS:26, IE:22, IL:23, IT:27, JO:30, KZ:20, KW:30, LV:21, LB:28, LI:21, LT:20,
  LU:20, MK:19, MT:31, MR:27, MU:30, MD:24, MC:27, ME:22, NL:18, NO:15, PK:24, PS:29,
  PL:28, PT:25, QA:29, RO:24, SM:27, SA:24, RS:22, SK:24, SI:19, ES:24, SE:24, CH:21,
  TN:24, TR:26, AE:23, GB:22, VG:24
};
function routeIban(u, res, json) {
  const q = u.searchParams;
  const iban = (q.get('iban') || '').replace(/\s+/g, '').toUpperCase();
  if (!iban) return json(res, 400, { error: 'iban required' });
  const country = iban.slice(0, 2);
  const expectedLen = IBAN_LENGTHS[country];
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,26}$/.test(iban)) {
    return json(res, 200, { valid: false, reason: 'invalid format', iban });
  }
  if (!expectedLen) return json(res, 200, { valid: false, reason: 'unknown or unsupported country code: ' + country, iban });
  if (iban.length !== expectedLen) {
    return json(res, 200, { valid: false, reason: `length ${iban.length} != expected ${expectedLen} for ${country}`, iban, country, expected_length: expectedLen });
  }
  // mod-97 check: move first 4 chars to end, convert letters to numbers, mod 97 == 1
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged.split('').map(c => {
    const code = c.charCodeAt(0);
    return code >= 65 ? String(code - 55) : c;
  }).join('');
  // big-number mod in chunks (JS numbers lose precision on 30+ digits)
  let rem = 0;
  for (const digit of numeric) rem = (rem * 10 + parseInt(digit, 10)) % 97;
  const valid = rem === 1;
  // pretty print in groups of 4
  const pretty = iban.replace(/(.{4})/g, '$1 ').trim();
  const result = { iban, valid, country, length: iban.length, check_digits: iban.slice(2, 4), pretty };
  if (!valid) result.reason = 'checksum failed (mod-97 remainder ' + rem + ', expected 1)';
  return json(res, 200, result);
}
module.exports = { routeIban };
