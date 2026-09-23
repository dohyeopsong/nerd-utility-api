// /iban — IBAN validation (format + mod-97 checksum)
function parseIBAN(s) {
  return s.replace(/[\s-]/g, '').toUpperCase();
}
function ibanMod97(rearranged) {
  let remainder = 0;
  for (const ch of rearranged) {
    let v;
    if (ch >= '0' && ch <= '9') v = ch.charCodeAt(0) - 48;
    else if (ch >= 'A' && ch <= 'Z') v = ch.charCodeAt(0) - 55;
    else return null;
    if (v > 9) { // two digits
      remainder = (remainder * 10 + Math.floor(v / 10)) % 97;
      remainder = (remainder * 10 + (v % 10)) % 97;
    } else {
      remainder = (remainder * 10 + v) % 97;
    }
  }
  return remainder;
}
const LENGTHS = { GB:22, DE:22, FR:27, NL:18, ES:24, IT:27, CH:21, AT:20, BE:16, PT:25, IE:22, PL:28, NO:15, SE:24, DK:18, FI:18, LU:20, CZ:24, HU:28, RO:24, BG:22, GR:27, TR:26, UA:29, SA:24, AE:23 };

function validateIBAN(raw) {
  const s = parseIBAN(raw);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(s)) return { error: 'invalid IBAN format' };
  const cc = s.slice(0, 2);
  const result = { iban: s, countryCode: cc };
  const expectedLen = LENGTHS[cc];
  if (expectedLen) result.length = { actual: s.length, expected: expectedLen, valid: s.length === expectedLen };
  // mod-97: move first 4 chars to end
  const rearranged = s.slice(4) + s.slice(0, 4);
  const rem = ibanMod97(rearranged);
  if (rem === null) return { error: 'invalid characters' };
  result.checksumValid = rem === 1;
  result.valid = rem === 1 && (!expectedLen || s.length === expectedLen);
  return result;
}

function routeIban(u, res, json) {
  const q = u.searchParams.get('iban');
  if (!q) return json(res, 400, { error: 'provide ?iban=GB82WEST12345698765432' });
  return json(res, 200, validateIBAN(q));
}

module.exports = { routeIban, validateIBAN };
