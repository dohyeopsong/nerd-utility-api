// /iban?number=DE89370400440532013000 → IBAN validator (mod-97 checksum, country length rules)
const COUNTRY_LENGTHS = { AL:28, AD:24, AT:20, AZ:28, BH:22, BE:16, BA:20, BR:29, BG:22, HR:21, CY:28, CZ:24, DK:18, DO:28, EE:20, FO:18, FI:18, FR:27, GE:22, DE:22, GI:23, GR:27, GL:18, GT:28, HU:28, IS:26, IE:22, IL:23, IT:27, JO:30, KZ:20, KW:30, LV:21, LB:28, LI:21, LT:20, LU:20, MK:19, MT:31, MR:27, MU:30, MC:27, MD:24, ME:22, NL:18, NO:15, PK:24, PS:29, PL:28, PT:25, QA:29, RO:24, SM:27, SA:24, RS:22, SK:24, SI:19, ES:24, SE:24, CH:21, TN:24, TR:26, AE:23, GB:22, VG:24 };
function routeIban(u, res, json) {
  const raw = u.searchParams.get('number') || u.searchParams.get('iban');
  if (!raw) return json(res, 400, { error: 'pass number=<IBAN>' });
  const iban = raw.toUpperCase().replace(/\s+/g, '');
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return json(res, 400, { error: 'invalid IBAN structure' });
  const cc = iban.slice(0, 2);
  const expectedLen = COUNTRY_LENGTHS[cc];
  if (!expectedLen) return json(res, 400, { error: 'unknown country code: ' + cc, supportedCountries: Object.keys(COUNTRY_LENGTHS).length });
  const lengthOk = iban.length === expectedLen;
  // mod-97: move first 4 chars to end, convert letters to numbers
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const v = ch >= '0' && ch <= '9' ? +ch : ch.charCodeAt(0) - 55;
    remainder = (remainder * (v > 9 ? 100 : 10) + v) % 97;
  }
  const checksumOk = remainder === 1;
  return json(res, 200, {
    iban,
    country: cc,
    length: iban.length,
    expectedLength: expectedLen,
    lengthOk,
    checkDigits: iban.slice(2, 4),
    checksumOk,
    valid: lengthOk && checksumOk,
    bban: iban.slice(4),
    note: 'mod-97 validation per ISO 13616. Does not verify the account exists.'
  });
}
module.exports = { routeIban };
