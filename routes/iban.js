// /iban — IBAN validation (ISO 13616, mod-97 checksum)
function routeIban(u, res, json) {
  const p = u.searchParams;
  const raw = (p.get('iban') || p.get('i') || '').trim();
  const iban = raw.replace(/[\s-]/g, '').toUpperCase();

  if (!iban) {
    return json(res, 200, { usage: '?iban=DE89370400440532013000' });
  }

  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) {
    return json(res, 400, { iban: raw, error: 'invalid IBAN format (expected 2 letters country + 2 digits check + 10-30 alphanumeric)' });
  }

  // Mod-97: move first 4 chars to end, convert letters to numbers, compute mod 97
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, c => (c.charCodeAt(0) - 55).toString());
  let remainder = 0;
  for (const ch of numeric) remainder = (remainder * 10 + parseInt(ch, 10)) % 97;

  const valid = remainder === 1;
  const result = {
    iban,
    valid,
    country: iban.slice(0, 2),
    checkDigits: iban.slice(2, 4),
    bban: iban.slice(4),
    formatted: iban.replace(/(.{4})/g, '$1 ').trim()
  };

  // Country-specific length checks for common countries
  const lengths = { DE:22, GB:22, FR:27, NL:18, ES:24, IT:27, CH:21, AT:20, BE:16, PL:28, SE:24, NO:15, DK:18, FI:18, PT:25, IE:22, LU:20, CZ:24, HU:28, RO:24 };
  if (lengths[iban.slice(0, 2)] && iban.length !== lengths[iban.slice(0, 2)]) {
    result.lengthValid = false;
    result.expectedLength = lengths[iban.slice(0, 2)];
  }

  return json(res, 200, result);
}

module.exports = { routeIban };
