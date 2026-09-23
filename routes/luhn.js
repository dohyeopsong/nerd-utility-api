// /luhn — Luhn algorithm check + check-digit computation (credit cards, IMEI, etc.)
function routeLuhn(u, res, json) {
  const p = u.searchParams;
  const num = (p.get('num') || '').replace(/[\s-]/g, '');
  if (!num) return json(res, 200, { usage: '?num=4532015112830366 — validate a Luhn number, or ?compute=453201511283036 to get the check digit' });
  if (!/^\d+$/.test(num)) return json(res, 400, { error: 'digits only (spaces/hyphens stripped)' });
  const digits = num.split('').map(Number);
  const luhnSum = (d) => {
    let sum = 0, dbl = false;
    for (let i = d.length - 1; i >= 0; i--) {
      let x = d[i];
      if (dbl) { x *= 2; if (x > 9) x -= 9; }
      sum += x; dbl = !dbl;
    }
    return sum;
  };
  if (p.get('compute') !== null) {
    // compute check digit for the given partial number
    const d = digits.slice();
    d.push(0); // placeholder so the check digit position is counted
    let sum = luhnSum(d);
    const check = (10 - (sum % 10)) % 10;
    const full = num + check;
    return json(res, 200, { input: num, check_digit: check, full_number: full, valid: true });
  }
  const sum = luhnSum(digits);
  const valid = sum % 10 === 0;
  const out = { number: num, valid, luhn_sum: sum };
  // guess card network for 13-19 digit numbers
  if (num.length >= 13 && num.length <= 19) {
    const net =
      /^4/.test(num) ? 'visa' :
      /^(5[1-5]|2[2-7])/.test(num) ? 'mastercard' :
      /^3[47]/.test(num) ? 'amex' :
      /^6(?:011|5)/.test(num) ? 'discover' :
      /^(60|65|81|82|508)/.test(num) ? 'rupay' :
      /^(35|2131|1800)/.test(num) ? 'jcb' :
      /^(30[0-5]|36|38)/.test(num) ? 'diners' : null;
    if (net) out.network_guess = net;
  }
  if (num.length === 15 && /^35/.test(num)) out.possible = 'IMEI';
  return json(res, 200, out);
}
module.exports = { routeLuhn };
