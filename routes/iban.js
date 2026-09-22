// /iban — IBAN validation: country-specific length + mod-97 checksum
const LENGTHS = {
  AL:28, AD:24, AT:20, AZ:28, BH:22, BE:16, BA:20, BR:29, BG:22, HR:21, CY:28, CZ:24,
  DK:18, DO:28, EE:20, FO:18, FI:18, FR:27, GE:22, DE:22, GI:23, GR:27, GL:18, GT:28,
  HU:28, IS:26, IE:22, IL:23, IT:27, JO:30, KZ:20, KW:30, LV:21, LB:28, LI:21, LT:20,
  LU:20, MK:19, MT:31, MR:27, MU:30, MD:24, MC:27, ME:22, NL:18, NO:15, PK:24, PS:29,
  PL:28, PT:25, QA:29, RO:24, SM:27, SA:24, RS:22, SK:24, SI:19, ES:24, SE:24, CH:21,
  TN:24, TR:26, AE:23, GB:22, VG:24
};

function routeIban(u, res, json) {
  const q = u.searchParams;
  const raw = q.get('iban');
  if (!raw) return json(res, 400, { error: 'provide ?iban=', example: '/iban?iban=GB82WEST12345698765432' });
  const s = raw.toUpperCase().replace(/\s+/g, '');

  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(s))
    return json(res, 200, { iban: s, valid: false, reason: 'format: 2 letters (country) + 2 digits (check) + BBAN' });

  const result = { iban: s, country: s.slice(0, 2) };
  const expectedLen = LENGTHS[result.country];
  if (!expectedLen) {
    result.valid = false;
    result.reason = 'unknown/unsupported country code';
    return json(res, 200, result);
  }
  result.expected_length = expectedLen;
  if (s.length !== expectedLen) {
    result.valid = false;
    result.reason = `length should be ${expectedLen} for ${result.country}, got ${s.length}`;
    return json(res, 200, result);
  }

  // mod-97: move first 4 chars to end, translate letters, compute mod
  const rearranged = s.slice(4) + s.slice(0, 4);
  let num = '';
  for (const c of rearranged) num += /[A-Z]/.test(c) ? String(c.charCodeAt(0) - 55) : c;
  // compute mod 97 with big-number-free chunking
  let rem = 0;
  for (const d of num) rem = (rem * 10 + +d) % 97;
  result.checksum_ok = rem === 1;
  result.valid = rem === 1;
  if (rem !== 1) result.reason = 'mod-97 checksum failed';
  return json(res, 200, result);
}

module.exports = { routeIban };
