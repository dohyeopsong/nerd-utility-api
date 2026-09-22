// /luhn — Luhn algorithm: validate + compute check digit (credit cards, IMEI, etc.)
function routeLuhn(u, res, json) {
  const q = u.searchParams;
  const raw = q.get('number');
  if (!raw) return json(res, 400, { error: 'provide ?number=', example: '/luhn?number=4532015112830366' });
  const s = raw.replace(/[\s-]/g, '');

  if (!/^[0-9]+$/.test(s))
    return json(res, 400, { error: 'digits only (spaces/dashes stripped)' });
  if (s.length < 2)
    return json(res, 400, { error: 'need at least 2 digits' });

  // detect card network (IIN ranges)
  let network = null;
  const iin = parseInt(s.slice(0, 4), 10);
  const iin2 = parseInt(s.slice(0, 2), 10);
  if (/^4/.test(s)) network = 'visa';
  else if ((iin2 >= 51 && iin2 <= 55) || (iin >= 2221 && iin <= 2720)) network = 'mastercard';
  else if (/^(34|37)/.test(s)) network = 'amex';
  else if (/^(6011|65|64[4-9])/.test(s) || (iin >= 622126 && iin <= 622925)) network = 'discover';
  else if (/^3(0[0-5]|[68])/.test(s)) network = 'diners-club';
  else if (/^35/.test(s)) network = 'jcb';
  else if (/^(50|5[6-9]|6[0-9])/.test(s)) network = 'maestro/unionpay-possible';

  const result = { number: s, length: s.length, valid: luhnValid(s) };
  if (network) result.possible_network = network;
  if (result.valid) {
    result.network = network || 'unknown';
  }

  // completion mode: provide number without check digit, we compute it
  if (q.get('complete') === 'true' && !result.valid) {
    let sum = 0, dbl = true; // next appended digit would be check digit, so double from right of payload
    for (let i = s.length - 1; i >= 0; i--) {
      let d = +s[i];
      if (dbl) { d *= 2; if (d > 9) d -= 9; }
      sum += d; dbl = !dbl;
    }
    result.check_digit = String((10 - (sum % 10)) % 10);
    result.completed_number = s + result.check_digit;
  }
  return json(res, 200, result);
}

function luhnValid(s) {
  let sum = 0, dbl = false;
  for (let i = s.length - 1; i >= 0; i--) {
    let d = +s[i];
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d; dbl = !dbl;
  }
  return sum % 10 === 0;
}

module.exports = { routeLuhn, luhnValid };
