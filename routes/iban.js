// IBAN validator: country-specific length/structure + mod-97 checksum
const FORMATS = {
  GB:20, DE:22, FR:27, IT:27, ES:24, NL:18, BE:16, CH:21, AT:20, PT:25, IE:22, DK:18,
  NO:15, SE:24, FI:18, PL:28, CZ:24, HU:28, RO:24, GR:27, TR:26, LU:20, LT:20, LV:21,
  EE:20, BG:22, HR:21, SI:19, SK:24, CY:28, MT:31, IS:26, UA:29, SA:24, AE:23
};
function validate(input) {
  let iban = String(input || '').toUpperCase().replace(/[\s-]/g, '');
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)) return { error: 'invalid IBAN structure (country code + check digits + BBAN)' };
  const country = iban.slice(0, 2);
  const expectedLen = FORMATS[country];
  if (!expectedLen) return { error: `unknown/unsupported country code ${country}`, country };
  if (iban.length !== expectedLen) return { error: `${country} IBAN must be ${expectedLen} characters, got ${iban.length}`, country };
  // mod-97: move first 4 chars to end, transliterate, mod 97 == 1
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const num = rearranged.replace(/[A-Z]/g, c => String(c.charCodeAt(0) - 55));
  let rem = 0;
  for (const d of num) rem = (rem * 10 + +d) % 97;
  const out = {
    iban, country,
    checkDigits: iban.slice(2, 4),
    bban: iban.slice(4),
    checksumValid: rem === 1,
    valid: rem === 1
  };
  if (!out.valid) out.reason = `mod-97 remainder is ${rem}, expected 1`;
  return out;
}
function routeIban(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  if (!q.iban) return json(res, 400, { error: 'missing ?iban= parameter' });
  return json(res, 200, validate(q.iban));
}
module.exports = { routeIban, validate };
