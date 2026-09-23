// /iban — IBAN validation: country length rules + mod-97 checksum
const LEN = { AL:28,AD:24,AT:20,AZ:28,BH:22,BE:16,BA:20,BR:29,BG:22,HR:21,CY:28,CZ:24,DK:18,DO:28,EE:20,
  FO:18,FI:18,FR:27,GE:22,DE:22,GI:23,GR:27,GL:18,GT:28,HU:28,IS:26,IE:22,IL:23,IT:27,JO:30,KZ:20,KW:30,
  LV:21,LB:28,LI:21,LT:20,LU:20,MK:19,MT:31,MR:27,MU:30,MD:24,MC:27,ME:22,NL:18,NO:15,PK:24,PS:29,PL:28,
  PT:25,QA:29,RO:24,SM:27,SA:24,RS:22,SK:24,SI:19,ES:24,SE:24,CH:21,TN:24,TR:26,AE:23,GB:22,YE:30 };
function routeIban(u, res, json) {
  const p = u.searchParams;
  let raw = (p.get('iban') || '').replace(/[\s-]/g, '').toUpperCase();
  if (!raw) return json(res, 200, { usage: '?iban=DE89370400440532013000 — IBAN validation with mod-97 checksum' });
  const out = { input: raw };
  const cc = raw.slice(0, 2);
  if (!/^[A-Z]{2}/.test(raw)) return json(res, 400, { ...out, error: 'missing country code' });
  if (!LEN[cc]) return json(res, 400, { ...out, error: `unknown country: ${cc}` });
  out.country = cc;
  out.expected_length = LEN[cc];
  out.length_valid = raw.length === LEN[cc];
  if (!out.length_valid) return json(res, 422, { ...out, valid: false, error: `length ${raw.length} != ${LEN[cc]}` });
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(raw)) return json(res, 400, { ...out, error: 'invalid characters' });
  // mod-97
  const rearr = raw.slice(4) + raw.slice(0, 4);
  const s = rearr.split('').map(c => c >= 'A' ? String(c.charCodeAt(0) - 55) : c).join('');
  let rem = 0;
  for (const d of s) rem = (rem * 10 + +d) % 97;
  out.checksum_valid = rem === 1;
  out.valid = out.checksum_valid;
  if (out.valid) {
    out.bank_code = raw.slice(4, 12); // rough — country-specific
    out.account = raw.slice(12);
  }
  return json(res, out.valid ? 200 : 422, out);
}
module.exports = { routeIban };
