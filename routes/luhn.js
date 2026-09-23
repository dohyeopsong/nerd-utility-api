// /luhn — Luhn algorithm validation (credit cards, IMEI, etc.) + card brand detection
function routeLuhn(u, res, json) {
  const p = u.searchParams;
  const raw = (p.get('num') || '').replace(/[\s-]/g, '');
  if (!raw) return json(res, 200, { usage: '?num=4532015112830366 — Luhn check + card brand detection' });
  if (!/^\d{2,19}$/.test(raw)) return json(res, 400, { error: 'invalid: must be 2-19 digits' });
  let sum = 0, alt = false;
  for (let i = raw.length - 1; i >= 0; i--) {
    let d = +raw[i];
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d; alt = !alt;
  }
  const valid = sum % 10 === 0;
  const out = { input: raw, valid, length: raw.length };
  if (valid) {
    // brand detection (test numbers pass Luhn by design)
    if (/^4/.test(raw)) out.brand = 'Visa';
    else if (/^(5[1-5]|2(2[2-9]|[3-6]|7[01]|720))/.test(raw)) out.brand = 'Mastercard';
    else if (/^3[47]/.test(raw)) out.brand = 'American Express';
    else if (/^(6011|65|64[4-9])/.test(raw)) out.brand = 'Discover';
    else if (/^(30[0-5]|36|38)/.test(raw)) out.brand = 'Diners Club';
    else if (/^35/.test(raw)) out.brand = 'JCB';
    else if (/^(50|5[6-9]|6[0-9])/.test(raw)) out.brand = 'Maestro (possible)';
  }
  return json(res, valid ? 200 : 422, out);
}
module.exports = { routeLuhn };
