// routes/iban.js — IBAN validation, checksum, and structure decode
// GET /iban?iban=DE89370400440532013000
function mod97(str) {
  let rem = 0;
  for (const ch of str) {
    const v = /[0-9]/.test(ch) ? +ch : ch.charCodeAt(0) - 55; // A=10..Z=35
    rem = (rem * (/[0-9]/.test(ch) ? 10 : 100) + v) % 97;
  }
  return rem;
}
function routeIban(u, res, json) {
  const raw = u.searchParams.get('iban');
  if (!raw) return json(res, 400, { error: 'iban required' });
  const iban = raw.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(iban)) return json(res, 400, { error: 'malformed IBAN structure' });
  if (iban.length < 15 || iban.length > 34) return json(res, 400, { error: `length ${iban.length} outside 15-34` });
  const country = iban.slice(0, 2);
  const expectedLens = { NO:15,BE:16,DK:18,FI:18,NL:18,SK:24,ES:24,MT:31,SI:19,AT:20,LV:21,LT:20,CH:21,EE:20,DE:22,IE:22,FR:27,GR:27,IT:27,HR:21,CY:28,CZ:24,PL:28,PT:25,SE:24,HU:28,RO:24,BG:22,LU:20,GB:22 };
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const checksum = parseInt(iban.slice(2, 4), 10);
  const valid = mod97(rearranged) === 1;
  const out = {
    iban, country, checksum, valid,
    checkDigitsValid: checksum >= 2 && checksum <= 98,
    bban: iban.slice(4),
    lengthOk: expectedLens[country] ? iban.length === expectedLens[country] : null,
    expectedLength: expectedLens[country] || 'unknown'
  };
  if (country === 'DE') out.structure = { bankCode: iban.slice(4, 12), accountNumber: iban.slice(12) };
  if (country === 'GB') out.structure = { sortCode: iban.slice(4, 10), accountNumber: iban.slice(10) };
  if (country === 'FR') out.structure = { bankCode: iban.slice(4, 9), branchCode: iban.slice(9, 14), accountNumber: iban.slice(14, 25), key: iban.slice(25) };
  return json(res, 200, out);
}
module.exports = { routeIban };
