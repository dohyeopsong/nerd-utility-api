// IBAN validator: country length check + mod-97 checksum (ISO 13616)
const LENGTHS = {AD:24,AE:23,AL:28,AT:20,AZ:28,BA:20,BE:16,BG:22,BH:22,BI:27,BR:29,BY:28,CH:21,CR:22,CY:28,CZ:24,DE:22,DJ:27,DK:18,DO:28,EE:20,EG:29,ES:24,FI:18,FK:18,FO:18,FR:27,GB:22,GE:22,GI:23,GL:18,GR:27,GT:28,HR:21,HU:28,IE:22,IL:23,IQ:23,IS:26,IT:27,JO:31,KW:30,KZ:20,LB:28,LC:32,LI:21,LT:20,LU:20,LV:21,LY:25,MC:27,MD:24,ME:22,MK:19,MN:20,MR:27,MT:31,MU:30,NL:18,NO:15,OM:23,PK:24,PL:28,PS:29,PT:25,QA:29,RO:24,RS:22,RU:43,SA:24,SC:31,SD:18,SE:24,SI:19,SK:24,SM:27,SO:23,ST:25,SV:28,TL:23,TN:24,TR:26,UA:29,VA:22,VG:24,XK:20};
function validateIBAN(input) {
  const iban = String(input).replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)) return { valid: false, reason: 'invalid format' };
  const cc = iban.slice(0, 2);
  const expected = LENGTHS[cc];
  if (!expected) return { valid: false, reason: 'unknown country code: ' + cc };
  if (iban.length !== expected) return { valid: false, reason: `length ${iban.length} != ${expected} for ${cc}` };
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, c => c.charCodeAt(0) - 55);
  let rem = 0;
  for (const d of numeric) rem = (rem * 10 + (+d)) % 97;
  if (rem !== 1) return { valid: false, reason: `checksum failed (mod-97 = ${rem}, expected 1)` };
  return { valid: true, country: cc, checkDigits: iban.slice(2, 4), bban: iban.slice(4), length: iban.length, countryCodeName: cc };
}
function routeIban(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  if (!(q.iban || q.number)) return json(res, 400, { error: 'provide ?iban=<IBAN>' });
  return json(res, 200, { input: q.iban, ...validateIBAN(q.iban) });
}
module.exports = { routeIban, validateIBAN };
