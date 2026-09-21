// /card?number=4242424242424242 → Luhn check + network detection
function routeCard(u, res, json) {
  const raw = u.searchParams.get('number') || u.searchParams.get('value');
  if (!raw) return json(res, 400, { error: 'pass number=<card number>, e.g. /card?number=4242424242424242' });
  const num = raw.replace(/[\s-]/g, '');
  if (!/^\d{8,19}$/.test(num)) return json(res, 400, { error: 'invalid format: 8-19 digits expected' });

  // Luhn
  let sum = 0, alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = +num[i];
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d; alt = !alt;
  }
  const luhnOk = sum % 10 === 0;

  // Network detection (IIN ranges)
  let network = 'unknown';
  const n = +num.slice(0, 4), n1 = +num[0], n2 = +num.slice(0, 2), n3 = +num.slice(0, 3), n4 = +num.slice(0, 4), n6 = +num.slice(0, 6);
  if (n1 === 4) network = 'Visa';
  else if ((n2 >= 51 && n2 <= 55) || (n >= 2221 && n <= 2720)) network = 'Mastercard';
  else if ((n2 === 34 || n2 === 37)) network = 'American Express';
  else if ((n4 === 6011) || (n3 >= 644 && n3 <= 649) || (n2 === 65)) network = 'Discover';
  else if ((n4 >= 3528 && n4 <= 3589)) network = 'JCB';
  else if ((n >= 3000 && n <= 3059) || (n === 36 || n === 38)) network = 'Diners Club';
  else if (n6 >= 622126 && n6 <= 622925) network = 'UnionPay';
  else if (n1 === 6) network = 'Maestro';

  const expectedLens = { 'Visa': [13,16,19], 'Mastercard': [16], 'American Express': [15], 'Discover': [16,19], 'JCB': [16,17,18,19], 'Diners Club': [14,16,19], 'Maestro': [12,13,14,15,16,17,18,19], 'UnionPay': [16,17,18,19] }[network];
  const lengthOk = expectedLens ? expectedLens.includes(num.length) : null;

  return json(res, 200, {
    number: num,
    length: num.length,
    luhnValid: luhnOk,
    network,
    networkLengthOk: lengthOk,
    valid: luhnOk && (lengthOk !== false),
    note: 'validity = Luhn + standard network length. Does NOT mean the card is active or has funds.'
  });
}
module.exports = { routeCard };
