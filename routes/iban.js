// /iban — IBAN validation: country length table, mod-97 (ISO 7064) checksum
const LENGTHS = {
  AL:28, AD:24, AT:20, AZ:28, BH:22, BE:16, BA:20, BR:29, BG:22, HR:21, CY:28,
  CZ:24, DK:18, DO:28, EE:20, FO:18, FI:18, FR:27, GE:22, DE:22, GI:23, GL:18,
  GR:27, HU:28, IS:26, IE:22, IL:23, IT:27, JO:30, KZ:20, KW:30, LV:21, LB:28,
  LI:21, LT:20, LU:20, MK:19, MT:31, MR:27, MU:30, MD:24, MC:27, ME:22, NL:18,
  NO:15, PK:24, PS:29, PL:28, PT:25, QA:29, RO:24, SM:27, SA:24, RS:22, SK:24,
  SI:19, ES:24, SE:24, CH:21, TN:24, TR:26, AE:23, GB:22, VG:24
};

function mod97(s) {
  // rearrange: first 4 chars to end, convert letters to numbers (A=10..Z=35)
  const rearranged = s.slice(4) + s.slice(0, 4);
  let num = rearranged.replace(/[A-Z]/g, c => String(c.charCodeAt(0) - 55));
  let rem = 0;
  for (const ch of num) rem = (rem * 10 + parseInt(ch, 10)) % 97;
  return rem;
}

function validateIban(raw) {
  const iban = raw.replace(/\s+/g, '').toUpperCase();
  const out = { input: raw, iban, valid: false };
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(iban)) { out.reason = 'invalid IBAN syntax'; return out; }
  const cc = iban.slice(0, 2);
  if (!(cc in LENGTHS)) { out.reason = 'unknown country code ' + cc; return out; }
  out.country = cc;
  out.expectedLength = LENGTHS[cc];
  if (iban.length !== LENGTHS[cc]) { out.reason = `length ${iban.length} != ${LENGTHS[cc]} for ${cc}`; return out; }
  const rem = mod97(iban);
  out.checksumValid = rem === 1;
  if (rem !== 1) { out.reason = 'mod-97 checksum failed'; return out; }
  out.valid = true;
  return out;
}

function routeIban(u, res, json) {
  const iban = u.searchParams.get('iban') || u.searchParams.get('q');
  if (!iban) return json(res, 400, { error: 'missing ?iban=GB29NWBK60161331926819' });
  return json(res, 200, validateIban(iban));
}

module.exports = { routeIban, validateIban };
