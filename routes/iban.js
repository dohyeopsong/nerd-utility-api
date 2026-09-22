// /iban — IBAN validation (ISO 13616): format check + mod-97 checksum verification
function routeIban(u, res, json) {
  const q = u.searchParams;
  const iban = (q.get('iban') || '').replace(/\s+/g, '').toUpperCase();
  if (!iban) return json(res, 400, { error: 'iban required' });
  const re = /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/;
  if (!re.test(iban)) return json(res, 200, { valid: false, reason: 'invalid format (expected 2-letter country code + 2 check digits + BBAN)' });
  const country = iban.slice(0, 2);
  const lengths = { NO:15, BE:16, DK:18, FI:18, FO:18, GL:18, NL:18, MK:18, SI:19, AT:20, BA:20, EE:20, KZ:20, LT:20, LU:20, CR:21, HR:21, LV:21, LI:21, CH:21, BG:22, BH:22, DE:22, GB:22, GE:22, IE:22, ME:22, RS:22, AE:23, GI:23, IL:23, AD:24, CZ:24, ES:24, MD:24, PK:24, RO:24, SA:24, SE:24, SK:24, VA:24, TN:24, PT:25, IS:26, TR:26, FR:27, GR:27, IT:27, LC:28, UA:29, ST:29, MC:27, SM:27, AL:28, AZ:28, CY:28, DO:28, GT:28, HU:28, LB:28, NI:28, QA:29, BR:29 };
  const expected = lengths[country];
  if (expected === undefined) return json(res, 200, { valid: false, reason: `unknown country code '${country}'` });
  if (iban.length !== expected) return json(res, 200, { valid: false, reason: `length ${iban.length} does not match expected ${expected} for country ${country}`, country, expected_length: expected });
  // mod-97: move first 4 chars to end, convert letters to numbers (A=10..Z=35), check mod 97 == 1
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let rem = 0;
  for (const ch of rearranged) {
    const code = ch.charCodeAt(0);
    const val = code >= 65 ? (code - 55) : (code - 48); // letters or digits
    if (val < 0 || val > 35) return json(res, 200, { valid: false, reason: 'invalid character in IBAN' });
    rem = (rem * (code >= 65 ? 100 : 10) + val) % 97;
  }
  const valid = rem === 1;
  return json(res, 200, { iban, country, check_digits: iban.slice(2, 4), bban: iban.slice(4), length: iban.length, expected_length: expected, checksum_valid: valid, valid, reason: valid ? 'checksum passed (mod-97 = 1)' : `checksum failed (mod-97 = ${rem}, expected 1)` });
}
module.exports = { routeIban };
