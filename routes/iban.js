// /iban — IBAN validation, mod-97 checksum, country/format info
const COUNTRY_LENGTHS = {
  AD:24, AE:23, AL:28, AT:20, AZ:28, BA:20, BE:16, BG:22, BH:22, BI:27, BR:29, BY:28,
  CH:21, CR:22, CY:28, CZ:24, DE:22, DJ:27, DK:18, DO:28, EE:20, EG:29, ES:24, FI:18,
  FK:18, FO:18, FR:27, GB:22, GE:22, GI:23, GL:18, GR:27, HR:21, HU:28, IE:22, IL:23,
  IQ:23, IS:26, IT:27, JO:30, KW:30, KZ:20, LB:28, LC:32, LI:21, LT:20, LU:20, LV:21,
  LY:25, MC:27, MD:24, ME:22, MK:19, MN:20, MR:27, MT:31, MU:30, NI:28, NL:18, NO:15,
  OM:23, PK:24, PL:28, PS:29, PT:25, QA:29, RO:24, RS:22, RU:33, SA:24, SC:31, SD:18,
  SE:24, SI:19, SK:24, SM:27, SO:23, ST:25, SV:28, TL:23, TN:24, TR:26, UA:29, VA:22,
  VG:24, XK:20
};
function mod97(digits) {
  let rem = 0;
  for (const c of digits) { rem = (rem * 10 + +c) % 97; }
  return rem;
}
function routeIban(u, res, json) {
  const p = u.searchParams;
  const raw = p.get('iban');
  if (!raw) return json(res, 200, { usage: '?iban=DE89370400440532013000 — validates IBAN (mod-97), splits country/check/bban' });
  const iban = raw.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) {
    return json(res, 400, { error: 'invalid IBAN format (need country code + check digits + BBAN)' });
  }
  const cc = iban.slice(0, 2);
  const check = iban.slice(2, 4);
  const expectedLength = COUNTRY_LENGTHS[cc];
  if (!expectedLength) return json(res, 400, { error: 'unknown country code: ' + cc, iban });
  const rightLength = iban.length === expectedLength;
  // rearrange: first 4 chars to end, letters -> numbers (A=10..Z=35)
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = [...rearranged].map(c => /[A-Z]/.test(c) ? String(c.charCodeAt(0) - 55) : c).join('');
  const valid = rightLength && mod97(numeric) === 1;
  return json(res, 200, {
    iban,
    country: cc,
    expected_length: expectedLength,
    length_ok: rightLength,
    check_digits: check,
    checksum_valid: mod97(numeric) === 1,
    valid,
    bban: iban.slice(4),
  });
}
module.exports = { routeIban };
