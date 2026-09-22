// /iban — IBAN validation and checksum (ISO 13616)
function routeIban(u, res, json) {
  const q = u.searchParams;
  const mode = (q.get('mode') || 'validate').toLowerCase();
  const iban = (q.get('iban') || q.get('v') || '').replace(/\s+/g, '').toUpperCase();
  if (!iban) return json(res, 400, { error: 'iban required' });
  if (mode !== 'validate') return json(res, 400, { error: 'mode must be validate' });
  const errors = [];
  // structure: 2 letter country + 2 check digits + BBAN (up to 30)
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/.test(iban)) {
    return json(res, 200, {
      iban, valid: false,
      reason: 'invalid structure (expected: 2-letter country code + 2 check digits + BBAN)'
    });
  }
  const cc = iban.slice(0, 2);
  const checkDigits = iban.slice(2, 4);
  const bban = iban.slice(4);
  // country length registry (common ones)
  const LENGTHS = { GB:22, DE:22, FR:27, ES:24, IT:27, NL:18, BE:16, AT:20, CH:21, PL:28, SE:24, NO:15, DK:18, FI:18, PT:25, IE:22, CZ:24, RO:24, HU:28, BG:22, GR:27, LU:20, HR:21, SI:19, SK:24, EE:20, LV:21, LT:20, MT:31, CY:28, LI:21, SM:27, MC:27, IS:26, TR:26 };
  const expectedLen = LENGTHS[cc];
  let lengthOk = true;
  if (expectedLen && iban.length !== expectedLen) { lengthOk = false; errors.push(`length ${iban.length} but expected ${expectedLen} for ${cc}`); }
  // mod-97 check (ISO 7064): move first 4 chars to end, letters -> 10..35, compute mod 97 == 1
  const rearranged = bban + checkDigits + cc;
  const numStr = rearranged.replace(/[A-Z]/g, c => String(c.charCodeAt(0) - 55));
  let rem = 0;
  for (const ch of numStr) {
    rem = (rem * 10 + +ch) % 97;
  }
  const checksumOk = rem === 1;
  if (!checksumOk) errors.push(`mod-97 checksum failed (remainder ${rem}, expected 1)`);
  const bbanOk = /^[A-Z0-9]+$/.test(bban);
  if (!bbanOk) errors.push('BBAN contains invalid characters');
  return json(res, 200, {
    iban, valid: checksumOk && lengthOk && bbanOk,
    country: cc,
    check_digits: checkDigits,
    bban,
    checksum_valid: checksumOk,
    length_ok: lengthOk,
    expected_length: expectedLen || 'unknown',
    errors: errors.length ? errors : undefined
  });
}
module.exports = { routeIban };
