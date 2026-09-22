// /luhn — Luhn algorithm validation, card network + IMEI detection
function routeLuhn(u, res, json) {
  const q = u.searchParams;
  const raw = q.get('number') || q.get('card') || q.get('imei');
  if (!raw) return json(res, 400, { error: 'provide ?number=', example: '/luhn?number=4532015112830366' });
  const s = raw.replace(/[\s-]/g, '');
  if (!/^\d{2,19}$/.test(s))
    return json(res, 400, { error: 'expect digits only (2-19), optionally spaced/dashed' });

  // Luhn check
  let sum = 0, dbl = false;
  for (let i = s.length - 1; i >= 0; i--) {
    let d = +s[i];
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d; dbl = !dbl;
  }
  const valid = sum % 10 === 0;

  const result = {
    number: s, valid,
    length: s.length,
    type: detectType(s),
    formatted: format(s, detectType(s)),
  };
  if (!valid) {
    // nearest valid: adjust last digit
    const core = s.slice(0, -1);
    let sum2 = 0, dbl2 = true;
    for (let i = core.length - 1; i >= 0; i--) {
      let d = +core[i];
      if (dbl2) { d *= 2; if (d > 9) d -= 9; }
      sum2 += d; dbl2 = !dbl2;
    }
    const cd = (10 - (sum2 % 10)) % 10;
    result.corrected = core + cd;
  }
  return json(res, 200, result);
}

function detectType(s) {
  if (s.length === 15 && /^3[47]/.test(s)) return 'amex';
  if (s.length === 14 && /^3(0[0-5]|[68])/.test(s)) return 'dinersclub';
  if (/^4/.test(s) && [13,16,19].includes(s.length)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(s) && s.length === 16) return 'mastercard';
  if (/^6(011|5|4[4-9])/.test(s) && s.length === 16) return 'discover';
  if (s.length === 15 && s.startsWith('35')) return 'jcb15';
  if (/^35/.test(s) && [16,17,18,19].includes(s.length)) return 'jcb';
  if (s.length === 16 && /^50[0-9]{3}/.test(s)) return 'maestro-uk-debit';
  if (s.length === 15 && s.startsWith('4')) return 'visa-electron-15';
  if ([15,16,17].includes(s.length) && /^352[89]/.test(s)) return 'jcb';
  if (s.length === 15) return 'imei';   // IMEIs are typically 15 digits
  if (s.length === 16) return 'imei-with-software-version'; // IMEISV
  return 'unknown';
}

function format(s, type) {
  if (type === 'amex') return s.replace(/(\d{4})(\d{6})(\d{5})/, '$1 $2 $3');
  if (type.startsWith('diners')) return s.replace(/(\d{4})(\d{6})(\d{4})/, '$1 $2 $3');
  return s.replace(/(\d{4})(?=\d)/g, '$1 ');
}

module.exports = { routeLuhn };
