// IBAN validator: format, country length, mod-97 checksum
const LENGTHS = { AL:28, AD:24, AT:20, AZ:28, BH:22, BE:16, BA:20, BR:29, BG:22, HR:21, CY:28, CZ:24, DK:18, DO:28, EE:20, FO:18, FI:18, FR:27, GE:22, DE:22, GI:23, GR:27, GL:18, GT:28, HU:28, IS:26, IE:22, IL:23, IT:27, JO:30, KZ:20, KW:30, LV:21, LB:28, LI:21, LT:20, LU:20, MK:19, MT:31, MR:27, MU:30, MD:24, MC:27, ME:22, NL:18, NO:15, PK:24, PS:29, PL:28, PT:25, QA:29, RO:24, SM:27, SA:24, RS:22, SK:24, SI:19, ES:24, SE:24, CH:21, TN:24, TR:26, AE:23, GB:22, VG:24 };
function normalize(iban) { return (iban || '').replace(/\s+/g, '').toUpperCase(); }
function validate(iban) {
  if (!iban) return { error: 'missing ?iban= parameter' };
  const v = normalize(iban);
  if (v.length < 5) return { valid: false, reason: 'too short' };
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(v)) return { valid: false, reason: 'invalid format (expected 2-letter country code + 2 check digits + BBAN)' };
  const cc = v.slice(0, 2);
  const expectedLen = LENGTHS[cc];
  const out = { iban: v, countryCode: cc, checkDigits: v.slice(2, 4), expectedLength: expectedLen, actualLength: v.length };
  if (!expectedLen) { out.valid = false; out.reason = `unknown/unsupported country code ${cc}`; return out; }
  if (v.length !== expectedLen) { out.valid = false; out.reason = `length ${v.length} invalid for ${cc} (expected ${expectedLen})`; return out; }
  // mod-97: move first 4 chars to end, letters to numbers (A=10..Z=35)
  const rearranged = v.slice(4) + v.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, c => String(c.charCodeAt(0) - 55));
  let rem = 0;
  for (const d of numeric) rem = (rem * 10 + (+d)) % 97;
  out.checksumValid = rem === 1;
  out.valid = rem === 1;
  if (rem !== 1) out.reason = `mod-97 checksum failed (remainder ${rem}, expected 1)`;
  return out;
}
function routeIban(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  return json(res, 200, validate(q.iban));
}
module.exports = { routeIban, validate };
