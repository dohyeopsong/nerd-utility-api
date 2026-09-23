// /currency — ISO 4217 currency code info
const C = {
  USD: ['United States Dollar', '$', 2], EUR: ['Euro', '€', 2], GBP: ['British Pound Sterling', '£', 2],
  JPY: ['Japanese Yen', '¥', 0], CNY: ['Chinese Yuan Renminbi', '¥', 2], KRW: ['South Korean Won', '₩', 0],
  CHF: ['Swiss Franc', 'Fr', 2], CAD: ['Canadian Dollar', 'C$', 2], AUD: ['Australian Dollar', 'A$', 2],
  NZD: ['New Zealand Dollar', 'NZ$', 2], SEK: ['Swedish Krona', 'kr', 2], NOK: ['Norwegian Krone', 'kr', 2],
  DKK: ['Danish Krone', 'kr', 2], ISK: ['Icelandic Krona', 'kr', 0], HKD: ['Hong Kong Dollar', 'HK$', 2],
  SGD: ['Singapore Dollar', 'S$', 2], TWD: ['New Taiwan Dollar', 'NT$', 2], THB: ['Thai Baht', '฿', 2],
  MYR: ['Malaysian Ringgit', 'RM', 2], IDR: ['Indonesian Rupiah', 'Rp', 2], PHP: ['Philippine Peso', '₱', 2],
  VND: ['Vietnamese Dong', '₫', 0], INR: ['Indian Rupee', '₹', 2], PKR: ['Pakistani Rupee', 'Rs', 2],
  BDT: ['Bangladeshi Taka', '৳', 2], LKR: ['Sri Lankan Rupee', 'Rs', 2], NPR: ['Nepalese Rupee', 'Rs', 2],
  BRL: ['Brazilian Real', 'R$', 2], MXN: ['Mexican Peso', '$', 2], ARS: ['Argentine Peso', '$', 2],
  CLP: ['Chilean Peso', '$', 0], COP: ['Colombian Peso', '$', 2], PEN: ['Peruvian Sol', 'S/', 2],
  UYU: ['Uruguayan Peso', '$', 2], ZAR: ['South African Rand', 'R', 2], NGN: ['Nigerian Naira', '₦', 2],
  KES: ['Kenyan Shilling', 'KSh', 2], EGP: ['Egyptian Pound', 'E£', 2], GHS: ['Ghanaian Cedi', 'GH₵', 2],
  MAD: ['Moroccan Dirham', 'DH', 2], TND: ['Tunisian Dinar', 'DT', 3], AED: ['UAE Dirham', 'د.إ', 2],
  SAR: ['Saudi Riyal', '﷼', 2], QAR: ['Qatari Riyal', 'QR', 2], KWD: ['Kuwaiti Dinar', 'KD', 3],
  BHD: ['Bahraini Dinar', 'BD', 3], OMR: ['Omani Rial', '﷼', 3], JOD: ['Jordanian Dinar', 'JD', 3],
  ILS: ['Israeli New Shekel', '₪', 2], TRY: ['Turkish Lira', '₺', 2], RUB: ['Russian Ruble', '₽', 2],
  UAH: ['Ukrainian Hryvnia', '₴', 2], PLN: ['Polish Zloty', 'zł', 2], CZK: ['Czech Koruna', 'Kč', 2],
  HUF: ['Hungarian Forint', 'Ft', 2], RON: ['Romanian Leu', 'lei', 2], BGN: ['Bulgarian Lev', 'лв', 2],
  HRK: ['Croatian Kuna', 'kn', 2], RSD: ['Serbian Dinar', 'дин', 2], HRD: null,
  BTC: ['Bitcoin (crypto)', '₿', 8], ETH: ['Ether (crypto)', 'Ξ', 18],
  XAU: ['Gold (troy ounce)', 'XAU', 0], XAG: ['Silver (troy ounce)', 'XAG', 0],
};
delete C.HRD;

function routeCurrency(u, res, json) {
  const p = u.searchParams;
  const q = (p.get('code') || p.get('q') || '').trim();
  if (!q) return json(res, 400, { error: 'provide ?code=USD (or ?q=yen for name search). ?list=1 for all codes.' });
  if (p.get('list')) return json(res, 200, { codes: Object.keys(C).sort() });
  const up = q.toUpperCase();
  if (C[up]) {
    const [name, symbol, decimals] = C[up];
    return json(res, 200, { code: up, name, symbol, decimals, minor_unit: decimals ? `1 ${up} = 10^${decimals} minor units` : 'no minor unit' });
  }
  // name search
  const hits = Object.entries(C).filter(([k, v]) => v[0].toLowerCase().includes(q.toLowerCase())).map(([k, v]) => ({ code: k, name: v[0], symbol: v[1], decimals: v[2] }));
  if (hits.length) return json(res, 200, { query: q, matches: hits.slice(0, 20) });
  return json(res, 404, { error: `unknown currency code or name: ${q}` });
}
module.exports = { routeCurrency };
