// /luhn — Luhn algorithm: validate and complete check digits (cards, IMEI, etc.)
function digits(s) { return String(s).replace(/[\s-]/g, '').split('').map(Number); }

function luhnSum(ds) {
  let sum = 0, dbl = false;
  for (let i = ds.length - 1; i >= 0; i--) {
    let d = ds[i];
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    dbl = !dbl;
  }
  return sum;
}

function routeLuhn(u, res, json) {
  const p = u.searchParams;
  const partial = p.get('partial');
  if (partial) {
    const ds = digits(partial);
    if (!ds.length || ds.some(isNaN)) return json(res, 400, { error: 'invalid digits' });
    const check = (10 - (luhnSum([...ds, 0]) % 10)) % 10;
    return json(res, 200, { partial, checkDigit: check, complete: partial + check });
  }

  const num = (p.get('num') || p.get('n') || '').replace(/[\s-]/g, '');
  if (!num) {
    return json(res, 200, { usage: '?num=4532015112830366 (validate) | ?partial=453201511283036 (compute check digit)' });
  }
  if (!/^\d+$/.test(num)) return json(res, 400, { error: 'digits only (spaces/dashes tolerated)' });
  const ds = digits(num);
  const valid = luhnSum(ds) % 10 === 0;
  return json(res, 200, { num, valid, length: ds.length });
}

module.exports = { routeLuhn };
