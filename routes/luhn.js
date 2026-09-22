// /luhn — Luhn algorithm validation, check-digit generation (bugfix: doubling parity)
function luhnSum(digits) {
  // digits: array of numbers, most significant first
  // Double every second digit from the RIGHT (rightmost digit NOT doubled)
  let sum = 0;
  for (let i = digits.length - 1, dbl = false; i >= 0; i--, dbl = !dbl) {
    let d = digits[i];
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum;
}

function routeLuhn(u, res, json) {
  const q = u.searchParams;
  const num = (q.get('check') || '').replace(/[\s-]/g, '');
  const gen = q.get('gen') || '';
  const len = parseInt(q.get('len') || '0', 10);

  // mode 3: generate a random valid number of given length
  if (len > 1) {
    let digits = [];
    for (let i = 0; i < len - 1; i++) digits.push(Math.floor(Math.random() * 10));
    digits[0] = 1 + Math.floor(Math.random() * 9);
    // check digit appended at right; rightmost payload digit gets doubled
    let sum = 0;
    for (let i = digits.length - 1, dbl = true; i >= 0; i--, dbl = !dbl) {
      let d = digits[i];
      if (dbl) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
    }
    const check = (10 - (sum % 10)) % 10;
    const full = digits.join('') + check;
    return json(res, 200, { generated: full, length: len, valid: true });
  }

  // mode 2: compute check digit for a payload
  if (gen) {
    if (!/^\d+$/.test(gen)) return json(res, 200, { valid: false, error: 'gen must be digits only' });
    const digits = gen.split('').map(Number);
    let sum = 0;
    for (let i = digits.length - 1, dbl = true; i >= 0; i--, dbl = !dbl) {
      let d = digits[i];
      if (dbl) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
    }
    const check = (10 - (sum % 10)) % 10;
    return json(res, 200, { payload: gen, check_digit: check, full: gen + check, valid: true });
  }

  // mode 1: validate
  if (!num) {
    return json(res, 400, {
      error: 'provide ?check=79927398713 or ?gen=7992739871 or ?len=16',
      note: 'Luhn checksum used by credit cards, IMEIs, etc.'
    });
  }
  if (!/^\d+$/.test(num)) return json(res, 200, { input: num, valid: false, reason: 'digits only (spaces/dashes stripped automatically)' });

  const digits = num.split('').map(Number);
  const sum = luhnSum(digits);
  return json(res, 200, {
    input: num,
    valid: sum % 10 === 0,
    checksum_sum: sum
  });
}

module.exports = { routeLuhn };
