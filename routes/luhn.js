// /luhn — Luhn checksum validation + card network detection / IMEI check
function luhnCheck(numStr) {
  let sum = 0, alt = false;
  for (let i = numStr.length - 1; i >= 0; i--) {
    let d = numStr.charCodeAt(i) - 48;
    if (d < 0 || d > 9) return null; // non-digit
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d; alt = !alt;
  }
  return sum % 10 === 0;
}
const NETWORKS = [
  { name: 'visa', test: n => /^4/.test(n) && [13, 16, 19].includes(n.length) },
  { name: 'mastercard', test: n => /^(5[1-5]|2(2[2-9]|[3-6]|7[01]|720))/.test(n) && n.length === 16 },
  { name: 'amex', test: n => /^3[47]/.test(n) && n.length === 15 },
  { name: 'discover', test: n => /^(6011|65|64[4-9])/.test(n) && [16, 19].includes(n.length) },
  { name: 'diners-club', test: n => /^3(0[0-5]|[68])/.test(n) && n.length === 14 },
  { name: 'jcb', test: n => /^35(2[89]|[3-8])/.test(n) && [16, 19].includes(n.length) },
];
function routeLuhn(u, res, json) {
  const q = u.searchParams;
  const type = (q.get('type') || 'card').toLowerCase();
  let num = (q.get('number') || q.get('num') || '').replace(/[\s-]/g, '');
  if (!num) return json(res, 400, { error: 'number required' });
  const valid = luhnCheck(num);
  if (valid === null) return json(res, 400, { error: 'number contains non-digit characters' });
  const result = { number: num, length: num.length, luhn_valid: valid };
  if (type === 'card') {
    const net = NETWORKS.find(n => n.test(num));
    result.network = net ? net.name : 'unknown';
    result.is_card_format = /^\d{12,19}$/.test(num);
  } else if (type === 'imei') {
    result.is_imei = num.length === 15 && valid;
  } else if (type !== 'plain') {
    return json(res, 400, { error: 'type must be card, imei, or plain' });
  }
  return json(res, 200, result);
}
module.exports = { routeLuhn };
