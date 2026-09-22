// /iban — IBAN validation (format + mod-97 checksum) + country metadata
const COUNTRY_RULES = {
  AD:24, AE:23, AL:28, AT:20, AZ:28, BA:20, BE:16, BG:22, BH:22, BI:27, BR:29,
  BY:28, CH:21, CR:22, CY:28, CZ:24, DE:22, DJ:27, DK:18, DO:28, EE:20, EG:29,
  ES:24, FI:18, FK:18, FO:18, FR:27, GB:22, GE:22, GI:23, GL:18, GR:27, GT:28,
  HR:21, HU:28, IE:22, IL:23, IQ:23, IS:26, IT:27, JO:30, KW:30, KZ:20, LB:28,
  LC:32, LI:21, LT:20, LU:20, LV:21, LY:25, MC:27, MD:24, ME:22, MK:19, MN:20,
  MR:27, MT:31, MU:30, NI:28, NL:18, NO:15, OM:23, PK:24, PL:28, PS:29, PT:25,
  QA:29, RO:24, RS:22, RU:20, SA:24, SC:31, SD:18, SE:24, SI:19, SK:24, SM:27,
  ST:25, SV:28, TL:23, TN:24, TR:26, UA:29, VA:22, VG:24, XK:20
};

function routeIban(u, res, json) {
  const q = u.searchParams;
  const check = q.get('check');
  const compute = q.get('compute'); // BBAN + country, e.g. compute=DE89370400440532013000 minus check digits? simpler: compute=GB+BBAN

  if (check !== null) {
    const s = check.replace(/[\s-]/g, '').toUpperCase();
    const out = { iban: s, valid: false };
    if (s.length < 5) { out.reason = 'too short'; return json(res, 200, out); }

    const cc = s.slice(0, 2);
    out.country = cc;
    if (!/^[A-Z]{2}$/.test(cc)) { out.reason = 'country code must be 2 letters'; return json(res, 200, out); }
    if (!COUNTRY_RULES[cc]) { out.reason = `unknown/unsupported country code ${cc}`; return json(res, 200, out); }
    out.expected_length = COUNTRY_RULES[cc];

    if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(s)) { out.reason = 'format: 2 letters + 2 check digits + alphanumeric BBAN'; return json(res, 200, out); }
    if (s.length !== COUNTRY_RULES[cc]) { out.reason = `${cc} IBAN must be ${COUNTRY_RULES[cc]} chars, got ${s.length}`; return json(res, 200, out); }

    // mod-97: move first 4 chars to end, convert letters to numbers (A=10..Z=35)
    const rearranged = s.slice(4) + s.slice(0, 4);
    const numeric = rearranged.replace(/[A-Z]/g, c => String(c.charCodeAt(0) - 55));
    let rem = 0;
    for (const ch of numeric) rem = (rem * 10 + +ch) % 97;
    out.checksum_ok = rem === 1;
    out.valid = rem === 1;
    if (rem !== 1) out.reason = 'mod-97 checksum failed';
    return json(res, 200, out);
  }

  if (compute !== null) {
    // compute=CC + BBAN -> full valid IBAN with check digits
    const s = compute.replace(/[\s-]/g, '').toUpperCase();
    const m = s.match(/^([A-Z]{2})([A-Z0-9]+)$/);
    if (!m) return json(res, 400, { error: 'format: ?compute=CCbban e.g. ?compute=GBMARK00000000000000000' });
    const [, cc, bban] = m;
    if (!COUNTRY_RULES[cc]) return json(res, 400, { error: `unknown country code ${cc}` });
    if (2 + 2 + bban.length !== COUNTRY_RULES[cc])
      return json(res, 200, { country: cc, bban, valid: false, reason: `${cc} IBAN needs BBAN of ${COUNTRY_RULES[cc] - 4} chars, got ${bban.length}` });
    // check digits: 98 - (bban + cc + '00') mod 97
    const numeric = (bban + cc + '00').replace(/[A-Z]/g, c => String(c.charCodeAt(0) - 55));
    let rem = 0;
    for (const ch of numeric) rem = (rem * 10 + +ch) % 97;
    const cd = String(98 - rem).padStart(2, '0');
    return json(res, 200, { iban: cc + cd + bban, valid: true });
  }

  return json(res, 400, { error: 'provide ?check=IBAN or ?compute=CC+BBAN', examples: ['/iban?check=GB82WEST12345698765432', '/iban?compute=GBWEST12345698765432'] });
}

module.exports = { routeIban };
