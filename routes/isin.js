// /isin — ISO 6166 ISIN validation (12 chars, Luhn over transliterated digits)
function routeIsin(u, res, json) {
  const p = u.searchParams;
  const raw = (p.get('isin') || p.get('i') || '').trim();
  const isin = raw.toUpperCase();

  if (!isin) return json(res, 200, { usage: '?isin=US0378331005 (12 chars: 2-letter country + 9 alnum NSIN + check digit)' });

  if (!/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin)) {
    return json(res, 400, { isin: raw, error: 'ISIN must be 2 letters + 9 alphanumerics + 1 check digit (12 chars total)' });
  }

  // Luhn over transliterated string: letters -> 10 + position (A=10..Z=35), each becomes two digits
  const T = c => /[0-9]/.test(c) ? c : String(c.charCodeAt(0) - 55); // A=10, B=11, ...
  const s = isin.split('').map(T).join('');
  // Standard Luhn on the full digit string
  let sum = 0;
  const dbl = true; // rightmost digit (check) already included; double alternate starting from rightmost-1
  let arr = s.split('').reverse().map(Number);
  for (let i = 0; i < arr.length; i++) {
    let d = arr[i];
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  const valid = sum % 10 === 0;

  return json(res, 200, {
    isin,
    valid,
    countryOfIssue: isin.slice(0, 2),
    nsin: isin.slice(2, 11),
    checkDigit: isin[11],
    nsinType: isin.slice(2, 4) === 'US' && /^[0-9]+$/.test(isin.slice(2, 11)) ? 'CUSIP-based' : 'national scheme'
  });
}

module.exports = { routeIsin };
