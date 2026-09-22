// /luhn — Luhn algorithm checksum validation (credit cards, IMEI, etc.)
function routeLuhn(u, res, json) {
  const q = u.searchParams;
  const raw = (q.get('number') || q.get('num') || '').replace(/[\s-]/g, '');
  if (!raw) return json(res, 400, { error: 'number required' });
  if (!/^\d+$/.test(raw)) return json(res, 400, { error: 'number must contain only digits (spaces/dashes allowed)' });
  let sum = 0, alt = false;
  for (let i = raw.length - 1; i >= 0; i--) {
    let d = raw.charCodeAt(i) - 48;
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d; alt = !alt;
  }
  const valid = sum % 10 === 0;
  const out = { number: raw, length: raw.length, valid, check_digit: Number(raw[raw.length - 1]) };
  // card type detection (when length 13-19)
  if (valid) {
    const t = (() => {
      if (/^3[47]/.test(raw) && raw.length === 15) return 'amex';
      if (/^4/.test(raw) && [13, 16, 19].includes(raw.length)) return 'visa';
      if (/^(5[1-5]|2[2-7])/.test(raw) && raw.length === 16) return 'mastercard';
      if (/^6(011|5)/.test(raw) && raw.length === 16) return 'discover';
      if (/^3(0[0-5]|[68])/.test(raw) && [14, 16, 19].includes(raw.length)) return 'diners';
      if (/^35/.test(raw) && [16, 17, 18, 19].includes(raw.length)) return 'jcb';
      if (/^(60|65|81|82)/.test(raw) && [16, 19].includes(raw.length)) return 'rupay';
      return null;
    })();
    if (t) out.card_type = t;
  }
  return json(res, 200, out);
}
module.exports = { routeLuhn };
