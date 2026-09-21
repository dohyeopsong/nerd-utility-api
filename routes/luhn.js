// /luhn?number=4532015112830366 → generic Luhn checksum + payment card type detection
function routeLuhn(u, res, json) {
  const raw = u.searchParams.get('number') || u.searchParams.get('value');
  if (!raw) return json(res, 400, { error: 'pass number=<digit sequence>' });
  const num = raw.replace(/[\s-]/g, '');
  if (!/^\d{2,}$/.test(num)) return json(res, 400, { error: 'must be digits only (min 2)' });

  let sum = 0;
  const dbl = num.length % 2 === 0 ? 0 : 1; // for card numbers, double from second-to-last
  for (let i = num.length - 1; i >= 0; i--) {
    let d = +num[i];
    if ((num.length - 1 - i) % 2 === (dbl ? 0 : 1)) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  const valid = sum % 10 === 0;

  // card type detection for plausible lengths (13-19)
  let cardType = null;
  if (num.length >= 12 && num.length <= 19) {
    if (/^4/.test(num)) cardType = 'Visa';
    else if (/^(5[1-5]|2[2-7])/.test(num) && num.length === 16) cardType = 'Mastercard';
    else if (/^3[47]/.test(num)) cardType = 'American Express';
    else if (/^(6011|65|64[4-9])/.test(num)) cardType = 'Discover';
    else if (/^3(0[0-5]|[68])/.test(num)) cardType = 'Diners Club';
    else if (/^35/.test(num)) cardType = 'JCB';
    else if (/^(50|5[6-9]|6[0-9])/.test(num)) cardType = 'Maestro/Elo (possible)';
  }

  return json(res, 200, {
    number: num,
    length: num.length,
    luhnValid: valid,
    cardType: cardType || 'not a recognized card pattern',
    note: 'Checksum validity does not mean the card/account exists. Use only on data you own.'
  });
}
module.exports = { routeLuhn };
