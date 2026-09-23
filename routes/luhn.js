// /luhn — Luhn algorithm validation (credit card numbers, IMEI, etc.)
function luhnValid(digits) {
  let sum = 0, alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d; alt = !alt;
  }
  return sum % 10 === 0;
}
function luhnCheckDigit(partial) { // partial: digits without check digit
  let sum = 0, alt = true; // from rightmost of partial, will double last
  for (let i = partial.length - 1; i >= 0; i--) {
    let d = partial.charCodeAt(i) - 48;
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d; alt = !alt;
  }
  return String((10 - (sum % 10)) % 10);
}

function routeLuhn(u, res, json, body, isPost) {
  const q = u.searchParams.get('q');
  const mode = u.searchParams.get('mode') || 'validate'; // validate | checkdigit
  if (!isPost && !q) {
    return json(res, 200, {
      op: 'luhn',
      description: 'Luhn algorithm: validate numbers (cards, IMEI) or compute a check digit.',
      usage: '/luhn?q=4532015112830366 (validate) or /luhn?q=453201511283036&mode=checkdigit',
    });
  }
  if (!q) return json(res, 400, { error: 'Provide ?q=' });
  const raw = String(q).trim().replace(/[-\s]/g, '');
  if (!/^\d+$/.test(raw)) return json(res, 400, { error: 'Digits only (spaces/dashes allowed)' });

  if (mode === 'checkdigit') {
    return json(res, 200, { input: raw, checkDigit: luhnCheckDigit(raw), full: raw + luhnCheckDigit(raw) });
  }
  const brand = raw.startsWith('4') ? 'visa'
    : /^(5[1-5]|2[2-7])/.test(raw) ? 'mastercard'
    : /^3[47]/.test(raw) ? 'amex'
    : /^6(?:011|5)/.test(raw) ? 'discover' : null;
  return json(res, 200, {
    input: raw,
    valid: luhnValid(raw),
    length: raw.length,
    ...(brand ? { brandHint: brand } : {}),
  });
}

module.exports = { routeLuhn };
