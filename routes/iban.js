// /iban — IBAN validation: mod-97 checksum, country length/structure, paper format
const SPECS = {
  AL:28,AD:24,AT:20,AZ:28,BH:22,BE:16,BA:20,BR:29,BG:22,HR:21,CY:28,CZ:24,DK:18,
  DO:28,EE:20,FO:18,FI:18,FR:27,GE:22,DE:22,GI:23,GR:27,GL:18,GT:28,HU:28,IS:26,
  IE:22,IL:23,IT:27,JO:30,KZ:20,KW:30,LV:21,LB:28,LI:21,LT:20,LU:20,MK:19,MT:31,
  MR:27,MU:30,MD:24,MC:27,ME:22,NL:18,NO:15,PK:24,PS:29,PL:28,PT:25,QA:29,RO:24,
  SM:27,SA:24,RS:22,SK:24,SI:19,ES:24,SE:24,CH:21,TN:24,TR:26,AE:23,GB:22,VG:24,
};

function routeIban(u, res, json) {
  const q = u.searchParams;
  const raw = q.get('iban');
  if (!raw) return json(res, 400, { error: 'provide ?iban=', example: '/iban?iban=GB82WEST12345698765432' });
  const s = raw.replace(/[\s]/g, '').toUpperCase();

  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(s))
    return json(res, 400, { error: 'malformed IBAN (need CC + 2 check digits + BBAN)' });

  const cc = s.slice(0, 2);
  const result = { iban: s, country: cc, length: s.length };
  const expectedLen = SPECS[cc];
  if (!expectedLen) return json(res, 400, { error: 'unknown/unofficial IBAN country code', country: cc });
  if (s.length !== expectedLen)
    return json(res, 200, { ...result, valid: false, reason: 'wrong length',
      expected_length: expectedLen, paper_format: paper(s) });

  // mod-97: move first 4 chars to end, letters->numbers (A=10...), mod 97 == 1
  const rearranged = s.slice(4) + s.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, c => String(c.charCodeAt(0) - 55));
  let rem = 0;
  for (const ch of numeric) rem = (rem * 10 + +ch) % 97;
  result.valid = rem === 1;
  result.check_digits = s.slice(2, 4);
  result.bban = s.slice(4);
  result.paper_format = paper(s);
  if (!result.valid) {
    // compute correct check digits
    const base = s.slice(4) + cc + '00';
    const num = base.replace(/[A-Z]/g, c => String(c.charCodeAt(0) - 55));
    let r = 0;
    for (const ch of num) r = (r * 10 + +ch) % 97;
    const cd = String(98 - r).padStart(2, '0');
    result.expected_check_digits = cd;
    result.corrected = cc + cd + s.slice(4);
  }
  return json(res, 200, result);
}

function paper(s) { return s.replace(/(.{4})/g, '$1 ').trim(); }

module.exports = { routeIban };
