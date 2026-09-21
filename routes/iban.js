// IBAN validator: country length check + mod-97 checksum (ISO 13616)
const LEN = {AD:24,AE:23,AL:28,AT:20,AX:18,AZ:28,BA:20,BE:16,BG:22,BH:22,BI:27,BR:29,BY:28,CH:21,CR:22,CY:28,CZ:24,DE:22,DJ:27,DK:18,DO:28,EE:20,EG:29,ES:24,FI:18,FK:18,FO:18,FR:27,GB:22,GE:22,GI:23,GL:18,GR:27,GT:28,HR:21,HU:28,IE:22,IL:23,IQ:23,IS:26,IT:27,JO:30,KW:30,KZ:20,LB:28,LC:32,LI:21,LT:20,LU:20,LV:21,LY:25,MC:27,MD:24,ME:22,MK:19,MN:20,MR:27,MT:31,MU:30,NI:28,NL:18,NO:15,OM:23,PK:24,PL:28,PS:29,PT:25,QA:29,RO:24,RS:22,RU:33,SA:24,SC:31,SD:18,SE:24,SI:19,SK:24,SM:27,SO:23,ST:25,SV:28,TL:23,TN:24,TR:26,UA:29,VA:22,VG:24,XK:20};
function clean(s) { return String(s).replace(/[\s-]/g, '').toUpperCase(); }
function ibanMod97(iban) {
  const rearr = iban.slice(4) + iban.slice(0, 4);
  const num = rearr.replace(/[A-Z]/g, c => c.charCodeAt(0) - 55);
  let rem = 0;
  for (const d of num) rem = (rem * 10 + +d) % 97;
  return rem;
}
function routeIban(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  const input = q.iban || q.number;
  if (!input) return json(res, 400, { error: 'provide ?iban=<IBAN>' });
  const c = clean(input);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(c)) return json(res, 400, { error: 'malformed IBAN' });
  const cc = c.slice(0, 2);
  const expLen = LEN[cc];
  const errors = [];
  if (!expLen) errors.push('unknown country code: ' + cc);
  else if (c.length !== expLen) errors.push(`expected length ${expLen} for ${cc}, got ${c.length}`);
  const checksumOk = ibanMod97(c) === 1;
  if (!checksumOk) errors.push('checksum failed (mod-97)');
  return json(res, 200, {
    input, normalized: c, country: cc,
    expectedLength: expLen || null, actualLength: c.length,
    checksumValid: checksumOk,
    valid: errors.length === 0,
    ...(errors.length ? { errors } : {}),
    bban: c.slice(4),
    checkDigits: c.slice(2, 4)
  });
}
module.exports = { routeIban, ibanMod97 };
