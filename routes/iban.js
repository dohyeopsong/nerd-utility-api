// /iban — IBAN validation: mod-97 checksum + per-country length/structure
const IBAN_LEN = { AD:24, AE:23, AL:28, AT:20, AZ:28, BA:20, BE:16, BG:22, BH:22, BI:27, BR:29, BY:28, CH:21, CR:22, CY:28, CZ:24, DE:22, DJ:27, DK:18, DO:28, EE:20, EG:29, ES:24, FI:18, FK:18, FO:18, FR:27, GB:22, GE:22, GI:23, GL:18, GR:27, GT:28, HR:21, HU:28, IE:22, IL:27, IQ:23, IS:26, IT:27, JO:30, KW:30, KZ:20, LB:28, LC:32, LI:21, LT:20, LU:20, LV:21, LY:25, MC:27, MD:24, ME:22, MK:19, MN:20, MR:27, MT:31, MU:30, NI:28, NL:18, NO:15, OM:23, PK:24, PL:28, PS:29, PT:25, QA:29, RO:24, RS:22, RU:33, SA:24, SC:31, SD:18, SE:24, SI:19, SK:24, SM:27, SO:23, ST:25, SV:28, TL:23, TN:24, TR:26, UA:29, VA:22, VG:24, XK:20 };
function routeIban(u, res, json) {
  const iban = (u.searchParams.get('iban') || '').replace(/\s+/g, '').toUpperCase();
  if (!iban) return json(res, 200, { usage: '?iban=DE89370400440532013000 — validates checksum (mod-97) and country structure' });
  const out = { iban, formatted: iban.replace(/(.{4})/g, '$1 ').trim() };
  const cc = iban.slice(0, 2);
  if (!/^[A-Z]{2}/.test(iban)) return json(res, 400, { ...out, valid: false, error: 'must start with 2-letter country code' });
  if (!(cc in IBAN_LEN)) return json(res, 400, { ...out, valid: false, error: `unknown/unsupported country code: ${cc}` });
  out.country = cc; out.expected_length = IBAN_LEN[cc]; out.length = iban.length;
  if (iban.length !== IBAN_LEN[cc]) return json(res, 400, { ...out, valid: false, error: `length ${iban.length} != expected ${IBAN_LEN[cc]}` });
  if (!/^[A-Z0-9]+$/.test(iban)) return json(res, 400, { ...out, valid: false, error: 'invalid characters' });
  // mod-97: move first 4 chars to end, letters→numbers (A=10..Z=35)
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numStr = rearranged.replace(/[A-Z]/g, c => (c.charCodeAt(0) - 55).toString());
  // big-number mod: process in chunks
  let rem = 0;
  for (const d of numStr) rem = (rem * 10 + +d) % 97;
  out.checksum_valid = rem === 1;
  out.valid = rem === 1;
  return json(res, out.valid ? 200 : 400, out);
}
module.exports = { routeIban };
