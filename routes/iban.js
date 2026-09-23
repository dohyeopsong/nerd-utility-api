// /iban — IBAN validation (mod-97 checksum), country info, and test IBAN generation
// Country specs: length, BBAN structure hint (partial registry)
const COUNTRIES = {
  AL: 28, AD: 24, AT: 20, AZ: 28, BH: 22, BE: 16, BA: 20, BR: 29, BG: 22, HR: 21,
  CY: 28, CZ: 24, DK: 18, DO: 28, EE: 20, FO: 18, FI: 18, FR: 27, GE: 22, DE: 22,
  GI: 23, GR: 27, GL: 18, GT: 28, HU: 28, IS: 26, IQ: 23, IE: 22, IL: 23, IT: 27,
  JO: 30, KZ: 20, KW: 30, LV: 21, LB: 28, LI: 21, LT: 20, LU: 20, MK: 19, MT: 31,
  MR: 27, MU: 30, MD: 24, MC: 27, ME: 22, NL: 18, NO: 15, PK: 24, PS: 29, PL: 28,
  PT: 25, QA: 29, RO: 24, SM: 27, SA: 24, RS: 22, SC: 31, SK: 24, SI: 19, ES: 24,
  SE: 24, CH: 21, TN: 24, TR: 26, AE: 23, GB: 22, VG: 24
};

function normalize(iban) {
  return iban.replace(/[\s-]/g, '').toUpperCase();
}

function ibanToDigits(iban) {
  // move first 4 chars to end, convert letters to numbers (A=10...Z=35)
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let out = '';
  for (const ch of rearranged) {
    if (ch >= 'A' && ch <= 'Z') out += String(ch.charCodeAt(0) - 55);
    else if (ch >= '0' && ch <= '9') out += ch;
    else return null;
  }
  return out;
}

function mod97(digitStr) {
  let rem = 0;
  for (const ch of digitStr) {
    rem = (rem * 10 + (ch.charCodeAt(0) - 48)) % 97;
  }
  return rem;
}

function validateIban(raw) {
  const iban = normalize(raw);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) {
    return { valid: false, error: 'malformed IBAN (expect 2-letter country code, 2 check digits, BBAN)' };
  }
  const cc = iban.slice(0, 2);
  const issues = [];
  if (!COUNTRIES[cc]) issues.push('unknown country code ' + cc);
  else if (iban.length !== COUNTRIES[cc]) issues.push(`length ${iban.length} != expected ${COUNTRIES[cc]} for ${cc}`);
  const digits = ibanToDigits(iban);
  if (digits === null) return { valid: false, error: 'invalid characters in IBAN' };
  const rem = mod97(digits);
  const valid = rem === 1 && issues.length === 0;
  return {
    iban,
    country: cc,
    checkDigits: iban.slice(2, 4),
    length: iban.length,
    expectedLength: COUNTRIES[cc] || null,
    mod97: rem,
    valid,
    issues: issues.length ? issues : undefined
  };
}

function makeIban(cc, bban) {
  // compute check digits for given country code + BBAN
  const rearranged = bban + cc + '00';
  let s = '';
  for (const ch of rearranged) {
    if (ch >= 'A' && ch <= 'Z') s += String(ch.charCodeAt(0) - 55);
    else s += ch;
  }
  const rem = mod97(s);
  const check = (98 - rem).toString().padStart(2, '0');
  return cc + check + bban;
}

function randomBban(length) {
  let s = '';
  for (let i = 0; i < length; i++) s += Math.floor(Math.random() * 10);
  return s;
}

function routeIban(u, res, json) {
  const p = u.searchParams;
  const iban = p.get('iban');
  if (iban) return json(res, 200, validateIban(iban));

  const mode = p.get('mode');
  if (mode === 'generate' || mode === 'gen') {
    const cc = (p.get('country') || 'GB').toUpperCase();
    if (!COUNTRIES[cc]) return json(res, 400, { error: 'unknown country code. valid: ' + Object.keys(COUNTRIES).join(',') });
    const count = Math.min(25, Math.max(1, parseInt(p.get('count'), 10) || 1));
    const bbanLen = COUNTRIES[cc] - 4;
    const out = [];
    for (let i = 0; i < count; i++) out.push(makeIban(cc, randomBban(bbanLen)));
    return json(res, 200, { country: cc, count, ibans: out });
  }

  if (mode === 'countries') return json(res, 200, { countries: COUNTRIES });

  return json(res, 400, { error: 'provide ?iban=<value>, ?mode=generate&country=GB, or ?mode=countries' });
}

module.exports = { routeIban, validateIban, makeIban };
