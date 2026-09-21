// Luhn algorithm (mod-10) checksum — validate/generate — pure math, zero deps
function luhnDigits(id) { return String(id).replace(/[\s-]/g, ''); }
function checksumDigit(partial) {
  let sum = 0, dbl = true; // double from rightmost of partial
  for (let i = partial.length - 1; i >= 0; i--) {
    let d = +partial[i];
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d; dbl = !dbl;
  }
  return String((10 - (sum % 10)) % 10);
}
function validate(id) {
  const s = luhnDigits(id);
  if (!/^\d{2,}$/.test(s)) return { valid: false, error: 'must be 2+ digits (spaces/dashes allowed)' };
  const check = +s[s.length - 1];
  const expect = +checksumDigit(s.slice(0, -1));
  return { valid: check === expect, checksum: check, expected: expect, length: s.length, type: guessType(s) };
}
function guessType(s) {
  if (s.length === 15 && /^3[47]/.test(s)) return 'amex';
  if (s.length === 16 && /^4/.test(s)) return 'visa';
  if (s.length === 16 && /^5[1-5]/.test(s)) return 'mastercard';
  if (s.length === 16 && /^6(?:011|5)/.test(s)) return 'discover';
  if (s.length === 15 && /^35/.test(s)) return 'jcb-ish';
  if (s.length === 14 || s.length === 15) return 'imei-ish';
  return 'unknown';
}
function generate({ prefix = '', length = 16 } = {}) {
  if (length < 2) throw new Error('length must be >= 2');
  let body = String(prefix);
  const crypto = require('crypto');
  while (body.length < length - 1) body += crypto.randomInt(0, 10);
  return body + checksumDigit(body);
}
async function routeLuhn(u, res, json) {
  const q = u.searchParams;
  try {
    if (q.get('validate')) return json(res, 200, validate(q.get('validate')));
    if (q.get('generate') !== null) {
      const prefix = q.get('generate') || q.get('prefix') || '';
      return json(res, 200, { number: generate({ prefix, length: Math.min(19, Math.max(2, +q.get('length') || 16)) }) });
    }
    if (q.get('checksum')) {
      const s = luhnDigits(q.get('checksum'));
      if (!/^\d+$/.test(s)) return json(res, 400, { error: 'digits only' });
      return json(res, 200, { input: s, checksum_digit: checksumDigit(s) });
    }
    return json(res, 400, { error: 'use ?validate=, ?generate=prefix, or ?checksum=' });
  } catch (e) { return json(res, 400, { error: e.message }); }
}
module.exports = { routeLuhn, validate, generate, checksumDigit };
