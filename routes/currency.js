// /currency — ISO 4217 currency code lookup
const CURRENCIES = {
  USD: { name: 'US Dollar', symbol: '$', decimals: 2 },
  EUR: { name: 'Euro', symbol: '€', decimals: 2 },
  GBP: { name: 'British Pound', symbol: '£', decimals: 2 },
  JPY: { name: 'Japanese Yen', symbol: '¥', decimals: 0 },
  CNY: { name: 'Chinese Yuan', symbol: '¥', decimals: 2 },
  CHF: { name: 'Swiss Franc', symbol: 'Fr', decimals: 2 },
  CAD: { name: 'Canadian Dollar', symbol: 'C$', decimals: 2 },
  AUD: { name: 'Australian Dollar', symbol: 'A$', decimals: 2 },
  NZD: { name: 'New Zealand Dollar', symbol: 'NZ$', decimals: 2 },
  INR: { name: 'Indian Rupee', symbol: '₹', decimals: 2 },
  KRW: { name: 'South Korean Won', symbol: '₩', decimals: 0 },
  SGD: { name: 'Singapore Dollar', symbol: 'S$', decimals: 2 },
  HKD: { name: 'Hong Kong Dollar', symbol: 'HK$', decimals: 2 },
  MXN: { name: 'Mexican Peso', symbol: 'Mex$', decimals: 2 },
  BRL: { name: 'Brazilian Real', symbol: 'R$', decimals: 2 },
  ZAR: { name: 'South African Rand', symbol: 'R', decimals: 2 },
  SEK: { name: 'Swedish Krona', symbol: 'kr', decimals: 2 },
  NOK: { name: 'Norwegian Krone', symbol: 'kr', decimals: 2 },
  DKK: { name: 'Danish Krone', symbol: 'kr', decimals: 2 },
  PLN: { name: 'Polish Zloty', symbol: 'zł', decimals: 2 },
  CZK: { name: 'Czech Koruna', symbol: 'Kč', decimals: 2 },
  HUF: { name: 'Hungarian Forint', symbol: 'Ft', decimals: 2 },
  RUB: { name: 'Russian Ruble', symbol: '₽', decimals: 2 },
  TRY: { name: 'Turkish Lira', symbol: '₺', decimals: 2 },
  AED: { name: 'UAE Dirham', symbol: 'د.إ', decimals: 2 },
  SAR: { name: 'Saudi Riyal', symbol: '﷼', decimals: 2 },
  ILS: { name: 'Israeli Shekel', symbol: '₪', decimals: 2 },
  THB: { name: 'Thai Baht', symbol: '฿', decimals: 2 },
  IDR: { name: 'Indonesian Rupiah', symbol: 'Rp', decimals: 2 },
  PHP: { name: 'Philippine Peso', symbol: '₱', decimals: 2 },
  MYR: { name: 'Malaysian Ringgit', symbol: 'RM', decimals: 2 },
  VND: { name: 'Vietnamese Dong', symbol: '₫', decimals: 0 },
  NGN: { name: 'Nigerian Naira', symbol: '₦', decimals: 2 },
  KES: { name: 'Kenyan Shilling', symbol: 'KSh', decimals: 2 },
  EGP: { name: 'Egyptian Pound', symbol: 'E£', decimals: 2 },
  CLP: { name: 'Chilean Peso', symbol: 'CLP$', decimals: 0 },
  COP: { name: 'Colombian Peso', symbol: 'COL$', decimals: 2 },
  ARS: { name: 'Argentine Peso', symbol: '$', decimals: 2 },
  PKR: { name: 'Pakistani Rupee', symbol: '₨', decimals: 2 },
  BDT: { name: 'Bangladeshi Taka', symbol: '৳', decimals: 2 },
  UAH: { name: 'Ukrainian Hryvnia', symbol: '₴', decimals: 2 },
  RON: { name: 'Romanian Leu', symbol: 'lei', decimals: 2 },
  BGN: { name: 'Bulgarian Lev', symbol: 'лв', decimals: 2 },
  ISK: { name: 'Icelandic Krona', symbol: 'kr', decimals: 0 },
  XAU: { name: 'Gold (troy ounce)', symbol: 'AU', decimals: 4 },
  XAG: { name: 'Silver (troy ounce)', symbol: 'AG', decimals: 4 },
  BTC: { name: 'Bitcoin', symbol: '₿', decimals: 8 },
  ETH: { name: 'Ether', symbol: 'Ξ', decimals: 18 },
};

function routeCurrency(u, res, json) {
  const q = u.searchParams;
  const code = (q.get('code') || '').toUpperCase().trim();
  const query = (q.get('q') || '').toLowerCase().trim();

  if (!code && !query) return json(res, 200, { count: Object.keys(CURRENCIES).length, currencies: CURRENCIES });
  if (code) {
    const c = CURRENCIES[code];
    if (!c) return json(res, 404, { error: `unknown currency code: ${code}` });
    return json(res, 200, { code, ...c });
  }
  // search by name
  const matches = Object.entries(CURRENCIES)
    .filter(([k, v]) => v.name.toLowerCase().includes(query) || k.toLowerCase().includes(query))
    .map(([k, v]) => ({ code: k, ...v }));
  if (!matches.length) return json(res, 404, { error: `no match for: ${query}` });
  return json(res, 200, { count: matches.length, results: matches });
}
module.exports = { routeCurrency };
