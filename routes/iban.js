// /iban — validate IBAN (format + mod-97 checksum)
function routeIban(u, res, json) {
  const p = u.searchParams;
  const iban = (p.get('iban') || p.get('i') || '').trim().replace(/\s+/g, '');
  if (!iban) return json(res, 200, { usage: '?iban=<IBAN> — validate format and mod-97 checksum' });
  const up = iban.toUpperCase();
  const out = { input: iban, normalized: up };
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(up)) {
    out.valid = false; out.error = 'invalid structure: expected 2 letters (country) + 2 digits (check) + 10-30 alphanumeric (BBAN)';
    return json(res, 422, out);
  }
  // rearrange: first 4 chars to end, then letter->number mapping
  const rearranged = up.slice(4) + up.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, c => (c.charCodeAt(0) - 55).toString()).split('').map(Number);
  // mod 97 (ISO 7064)
  let rem = 0;
  for (const d of numeric) { rem = (rem * 10 + d) % 97; }
  out.country = up.slice(0, 2);
  out.check_digits = up.slice(2, 4);
  out.bban = up.slice(4);
  out.mod97 = rem;
  out.checksum_valid = rem === 1;
  out.valid = rem === 1;
  return json(res, 200, out);
}
module.exports = { routeIban };
