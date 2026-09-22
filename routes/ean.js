// /ean — EAN-8/UPC-A/EAN-13/EAN-14 check-digit validate + generate
function routeEan(u, res, json) {
  const q = u.searchParams;
  const code = (q.get('code') || q.get('text') || '').replace(/[\s-]/g, '');
  if (!code) return json(res, 400, { error: 'provide ?code=', example: '/ean?code=4006381333931' });
  if (!/^\d+$/.test(code)) return json(res, 400, { error: 'code must contain digits only' });

  const validLens = [8, 12, 13, 14];
  if (q.get('check') === 'digit' || q.get('mode') === 'generate') {
    // generate: input without check digit, append computed one
    const body = code.replace(/\d$/, '').length === code.length - 1 && validLens.includes(code.length) ? code : code;
    if (!validLens.includes(body.length + 1)) return json(res, 400, { error: 'body length must be 7, 11, 12, or 13 digits for generate mode' });
    return json(res, 200, { body, check_digit: eanCheckDigit(body), full_code: body + eanCheckDigit(body), type: body.length + 1 === 8 ? 'EAN-8' : body.length + 1 === 12 ? 'UPC-A' : body.length + 1 === 13 ? 'EAN-13' : 'EAN-14' });
  }

  if (!validLens.includes(code.length)) return json(res, 400, { error: 'code length must be 8, 12, 13, or 14 digits' });
  const body = code.slice(0, -1);
  const given = +code.slice(-1);
  const expected = eanCheckDigit(body);
  const type = code.length === 8 ? 'EAN-8' : code.length === 12 ? 'UPC-A' : code.length === 13 ? 'EAN-13' : 'EAN-14';
  return json(res, 200, {
    code, type,
    valid: given === expected,
    check_digit_given: given,
    check_digit_expected: expected,
    corrected_code: body + expected,
    country_prefix: code.length === 13 ? countryPrefix(+code.slice(0, 3)) : code.length === 12 ? countryPrefix(+code.slice(0, 1)) : null,
  });
}
function eanCheckDigit(body) {
  let sum = 0;
  const digits = [...body].map(Number).reverse();
  for (let i = 0; i < digits.length; i++) sum += digits[i] * (i % 2 === 0 ? 3 : 1);
  return (10 - (sum % 10)) % 10;
}
function countryPrefix(p) {
  if (p >= 0 && p <= 19) return 'US/Canada (UPC-A)';
  if (p >= 20 && p <= 29) return 'in-store';
  if (p >= 30 && p <= 39) return 'US drugs (NDC)';
  if (p >= 40 && p <= 49) return 'restricted distribution';
  if (p >= 50 && p <= 59) return 'coupons';
  if (p === 60) return null;
  if (p >= 61 && p <= 69) return null;
  if (p >= 490 && p <= 499) return 'Japan';
  if (p >= 450 && p <= 459) return 'Japan';
  if (p >= 380 && p <= 389) return 'Bulgaria';
  if (p >= 500 && p <= 509) return 'UK';
  if (p >= 570 && p <= 579) return 'Denmark';
  if (p >= 590 && p <= 599) return 'Poland';
  if (p >= 600 && p <= 601) return 'South Africa';
  if (p >= 640 && p <= 649) return 'Finland';
  if (p >= 690 && p <= 699) return 'China';
  if (p >= 700 && p <= 709) return 'Norway';
  if (p >= 730 && p <= 739) return 'Sweden';
  if (p >= 750) return 'Mexico';
  if (p >= 760 && p <= 769) return 'Switzerland';
  if (p >= 800 && p <= 839) return 'Italy';
  if (p >= 840 && p <= 849) return 'Spain';
  if (p >= 850) return 'Cuba';
  if (p >= 870) return 'Netherlands';
  if (p >= 880) return 'South Korea';
  if (p >= 885) return 'Thailand';
  if (p >= 888) return 'Singapore';
  if (p >= 890) return 'India';
  if (p >= 900 && p <= 919) return 'Austria';
  if (p >= 930 && p <= 939) return 'Australia';
  if (p >= 940 && p <= 949) return 'New Zealand';
  if (p >= 977) return 'ISSN (periodicals)';
  if (p >= 978 && p <= 979) return 'ISBN (books)';
  if (p === 980) return 'refund receipts';
  if (p >= 981 && p <= 984) return 'coupons';
  if (p === 99) return 'coupons';
  return 'other GS1 prefix';
}
module.exports = { routeEan };
