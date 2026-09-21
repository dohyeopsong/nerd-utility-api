// IBAN validator: format check, mod-97 checksum, country length, pretty-print
function routeIban(u, res, json) {
  const raw = ((u.searchParams.get('iban') || u.searchParams.get('number')) || u.searchParams.get('number') || '').replace(/\s+/g, '').toUpperCase();
  if (!raw) return json(res, 400, { error: 'missing iban param' });
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/.test(raw)) {
    return json(res, 400, { error: 'invalid IBAN format', iban: raw });
  }
  const cc = raw.slice(0, 2);
  const lengths = {
    AL:28, AD:24, AT:20, AZ:28, BH:22, BE:16, BA:20, BR:29, BG:22, HR:21, CY:28,
    CZ:24, DK:18, DO:28, EE:20, FO:18, FI:18, FR:27, GE:22, DE:22, GI:23, GR:27,
    GL:18, GT:28, HU:28, IS:26, IE:22, IL:23, IT:27, JO:30, KZ:20, KW:30, LV:21,
    LB:28, LI:21, LT:20, LU:20, MK:19, MT:31, MR:27, MU:30, MD:24, MC:27, ME:22,
    NL:18, NO:15, PK:24, PS:29, PL:28, PT:25, QA:29, RO:24, SM:27, SA:24, RS:22,
    SK:24, SI:19, ES:24, SE:24, CH:21, TN:24, TR:26, AE:23, GB:22, VG:24
  };
  const rearranged = raw.slice(4) + raw.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, c => c.charCodeAt(0) - 55);
  let rem = 0;
  for (const ch of numeric) rem = (rem * 10 + Number(ch)) % 97;
  const mod97Valid = rem === 1;
  const expectedLen = lengths[cc];
  const lengthValid = expectedLen === undefined ? null : raw.length === expectedLen;
  const valid = mod97Valid && (lengthValid !== false);
  return json(res, 200, {
    iban: raw,
    valid,
    mod97Valid,
    countryCode: cc,
    checkDigits: raw.slice(2, 4),
    length: raw.length,
    expectedLength: expectedLen ?? 'unknown country',
    lengthValid,
    bban: raw.slice(4),
    formatted: raw.replace(/(.{4})/g, '$1 ').trim()
  });
}
module.exports = { routeIban };
