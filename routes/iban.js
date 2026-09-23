// /iban — IBAN validation (length, mod-97 checksum, country formats)
const IBAN_LEN = { AL:28,AD:24,AT:20,AZ:28,BH:22,BE:16,BA:20,BR:29,BG:22,HR:21,CY:28,CZ:24,DK:18,
  DO:28,EE:20,FO:18,FI:18,FR:27,GE:22,DE:22,GI:23,GR:27,GL:18,GT:28,HU:28,IS:26,IE:22,IL:23,IT:27,
  JO:30,KZ:20,KW:30,LV:21,LB:28,LI:21,LT:20,LU:20,MK:19,MT:31,MR:27,MU:30,MD:24,MC:27,ME:22,NL:18,
  NO:15,PK:24,PS:29,PL:28,PT:25,QA:29,RO:24,SM:27,SA:24,RS:22,SK:24,SI:19,ES:24,SE:24,CH:21,TN:24,
  TR:26,AE:23,GB:22,VG:24 };

function mod97(s) {
  let rem = 0;
  for (const ch of s) {
    const v = ch >= '0' && ch <= '9' ? +ch : ch.charCodeAt(0) - 55; // A=10
    rem = (rem * (v < 10 ? 10 : 100) + v) % 97;
  }
  return rem;
}

function routeIban(u, res, json, body, isPost) {
  const q = u.searchParams.get('q') || u.searchParams.get('check');
  if (!isPost && !q) {
    return json(res, 200, {
      op: 'iban',
      description: 'IBAN validation: format, country length check, mod-97 checksum.',
      usage: '/iban?q=GB82WEST12345698765432 (alias: ?check=)',
    });
  }
  if (!q) return json(res, 400, { error: 'Provide ?q=' });
  const raw = String(q).trim().replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(raw)) return json(res, 200, { input: raw, valid: false, reason: 'invalid structure' });

  const cc = raw.slice(0, 2);
  const errors = [];
  if (!(cc in IBAN_LEN)) errors.push(`unknown country code ${cc}`);
  else if (raw.length !== IBAN_LEN[cc]) errors.push(`length ${raw.length}, expected ${IBAN_LEN[cc]} for ${cc}`);
  // mod-97: move first 4 chars to end, convert letters
  const rearranged = raw.slice(4) + raw.slice(0, 4);
  const checksumOk = mod97(rearranged) === 1;
  if (!checksumOk) errors.push('mod-97 checksum failed');

  return json(res, 200, {
    input: raw,
    valid: errors.length === 0,
    ...(errors.length ? { errors } : {}),
    country: cc,
    formatted: raw.replace(/(.{4})/g, '$1 ').trim(),
    checkDigits: raw.slice(2, 4),
  });
}

module.exports = { routeIban };
