// ISO 3166 country codes + ISO 4217 currency lookup
const COUNTRIES = {
  US: { name: 'United States', currency: 'USD', dial: '+1' }, CA: { name: 'Canada', currency: 'CAD', dial: '+1' },
  MX: { name: 'Mexico', currency: 'MXN', dial: '+52' }, BR: { name: 'Brazil', currency: 'BRL', dial: '+55' },
  AR: { name: 'Argentina', currency: 'ARS', dial: '+54' }, CL: { name: 'Chile', currency: 'CLP', dial: '+56' },
  GB: { name: 'United Kingdom', currency: 'GBP', dial: '+44' }, DE: { name: 'Germany', currency: 'EUR', dial: '+49' },
  FR: { name: 'France', currency: 'EUR', dial: '+33' }, ES: { name: 'Spain', currency: 'EUR', dial: '+34' },
  IT: { name: 'Italy', currency: 'EUR', dial: '+39' }, NL: { name: 'Netherlands', currency: 'EUR', dial: '+31' },
  BE: { name: 'Belgium', currency: 'EUR', dial: '+32' }, AT: { name: 'Austria', currency: 'EUR', dial: '+43' },
  CH: { name: 'Switzerland', currency: 'CHF', dial: '+41' }, SE: { name: 'Sweden', currency: 'SEK', dial: '+46' },
  NO: { name: 'Norway', currency: 'NOK', dial: '+47' }, DK: { name: 'Denmark', currency: 'DKK', dial: '+45' },
  FI: { name: 'Finland', currency: 'EUR', dial: '+358' }, IS: { name: 'Iceland', currency: 'ISK', dial: '+354' },
  IE: { name: 'Ireland', currency: 'EUR', dial: '+353' }, PT: { name: 'Portugal', currency: 'EUR', dial: '+351' },
  PL: { name: 'Poland', currency: 'PLN', dial: '+48' }, CZ: { name: 'Czechia', currency: 'CZK', dial: '+420' },
  GR: { name: 'Greece', currency: 'EUR', dial: '+30' }, TR: { name: 'Türkiye', currency: 'TRY', dial: '+90' },
  RU: { name: 'Russia', currency: 'RUB', dial: '+7' }, UA: { name: 'Ukraine', currency: 'UAH', dial: '+380' },
  CN: { name: 'China', currency: 'CNY', dial: '+86' }, JP: { name: 'Japan', currency: 'JPY', dial: '+81' },
  KR: { name: 'South Korea', currency: 'KRW', dial: '+82' }, IN: { name: 'India', currency: 'INR', dial: '+91' },
  ID: { name: 'Indonesia', currency: 'IDR', dial: '+62' }, SG: { name: 'Singapore', currency: 'SGD', dial: '+65' },
  MY: { name: 'Malaysia', currency: 'MYR', dial: '+60' }, TH: { name: 'Thailand', currency: 'THB', dial: '+66' },
  VN: { name: 'Vietnam', currency: 'VND', dial: '+84' }, PH: { name: 'Philippines', currency: 'PHP', dial: '+63' },
  AU: { name: 'Australia', currency: 'AUD', dial: '+61' }, NZ: { name: 'New Zealand', currency: 'NZD', dial: '+64' },
  ZA: { name: 'South Africa', currency: 'ZAR', dial: '+27' }, NG: { name: 'Nigeria', currency: 'NGN', dial: '+234' },
  EG: { name: 'Egypt', currency: 'EGP', dial: '+20' }, KE: { name: 'Kenya', currency: 'KES', dial: '+254' },
  MA: { name: 'Morocco', currency: 'MAD', dial: '+212' }, SA: { name: 'Saudi Arabia', currency: 'SAR', dial: '+966' },
  AE: { name: 'United Arab Emirates', currency: 'AED', dial: '+971' }, IL: { name: 'Israel', currency: 'ILS', dial: '+972' },
  QA: { name: 'Qatar', currency: 'QAR', dial: '+974' }, KW: { name: 'Kuwait', currency: 'KWD', dial: '+965' },
  HK: { name: 'Hong Kong', currency: 'HKD', dial: '+852' }, TW: { name: 'Taiwan', currency: 'TWD', dial: '+886' }
};
const CURRENCIES = {
  USD: { name: 'US Dollar', symbol: '$', minor: 2 }, EUR: { name: 'Euro', symbol: '€', minor: 2 },
  GBP: { name: 'British Pound', symbol: '£', minor: 2 }, JPY: { name: 'Japanese Yen', symbol: '¥', minor: 0 },
  CNY: { name: 'Chinese Yuan', symbol: '¥', minor: 2 }, KRW: { name: 'South Korean Won', symbol: '₩', minor: 0 },
  INR: { name: 'Indian Rupee', symbol: '₹', minor: 2 }, AUD: { name: 'Australian Dollar', symbol: 'A$', minor: 2 },
  CAD: { name: 'Canadian Dollar', symbol: 'C$', minor: 2 }, CHF: { name: 'Swiss Franc', symbol: 'CHF', minor: 2 },
  SEK: { name: 'Swedish Krona', symbol: 'kr', minor: 2 }, NOK: { name: 'Norwegian Krone', symbol: 'kr', minor: 2 },
  DKK: { name: 'Danish Krone', symbol: 'kr', minor: 2 }, MXN: { name: 'Mexican Peso', symbol: '$', minor: 2 },
  BRL: { name: 'Brazilian Real', symbol: 'R$', minor: 2 }, ZAR: { name: 'South African Rand', symbol: 'R', minor: 2 },
  SGD: { name: 'Singapore Dollar', symbol: 'S$', minor: 2 }, HKD: { name: 'Hong Kong Dollar', symbol: 'HK$', minor: 2 },
  NZD: { name: 'New Zealand Dollar', symbol: 'NZ$', minor: 2 }, THB: { name: 'Thai Baht', symbol: '฿', minor: 2 },
  IDR: { name: 'Indonesian Rupiah', symbol: 'Rp', minor: 2 }, PHP: { name: 'Philippine Peso', symbol: '₱', minor: 2 },
  MYR: { name: 'Malaysian Ringgit', symbol: 'RM', minor: 2 }, VND: { name: 'Vietnamese Dong', symbol: '₫', minor: 0 },
  TRY: { name: 'Turkish Lira', symbol: '₺', minor: 2 }, RUB: { name: 'Russian Ruble', symbol: '₽', minor: 2 },
  PLN: { name: 'Polish Złoty', symbol: 'zł', minor: 2 }, CZK: { name: 'Czech Koruna', symbol: 'Kč', minor: 2 },
  ILS: { name: 'Israeli New Shekel', symbol: '₪', minor: 2 }, SAR: { name: 'Saudi Riyal', symbol: '﷼', minor: 2 },
  AED: { name: 'UAE Dirham', symbol: 'د.إ', minor: 2 }, NGN: { name: 'Nigerian Naira', symbol: '₦', minor: 2 },
  EGP: { name: 'Egyptian Pound', symbol: 'E£', minor: 2 }, KES: { name: 'Kenyan Shilling', symbol: 'KSh', minor: 2 },
  MAD: { name: 'Moroccan Dirham', symbol: 'DH', minor: 2 }, ARS: { name: 'Argentine Peso', symbol: '$', minor: 2 },
  CLP: { name: 'Chilean Peso', symbol: '$', minor: 0 }, UAH: { name: 'Ukrainian Hryvnia', symbol: '₴', minor: 2 },
  ISK: { name: 'Icelandic Króna', symbol: 'kr', minor: 0 }, KWD: { name: 'Kuwaiti Dinar', symbol: 'KD', minor: 3 },
  QAR: { name: 'Qatari Riyal', symbol: 'QR', minor: 2 }, TWD: { name: 'New Taiwan Dollar', symbol: 'NT$', minor: 2 }
};
function routeIso(u, res, json) {
  const cc = (u.searchParams.get('country') || '').toUpperCase();
  const cur = (u.searchParams.get('currency') || '').toUpperCase();
  const name = u.searchParams.get('name');
  if (cc) {
    if (!/^[A-Z]{2}$/.test(cc)) return json(res, 400, { error: 'country must be 2-letter ISO 3166-1 alpha-2' });
    const c = COUNTRIES[cc];
    if (!c) return json(res, 404, { error: 'unknown country code: ' + cc });
    return json(res, 200, { code: cc, name: c.name, currency: c.currency, currencyDetails: CURRENCIES[c.currency] || null, dialingCode: c.dial });
  }
  if (cur) {
    if (!/^[A-Z]{3}$/.test(cur)) return json(res, 400, { error: 'currency must be 3-letter ISO 4217' });
    const c = CURRENCIES[cur];
    if (!c) return json(res, 404, { error: 'unknown currency code: ' + cur });
    const users = Object.entries(COUNTRIES).filter(([k, v]) => v.currency === cur).map(([k, v]) => v.name);
    return json(res, 200, { code: cur, ...c, usedBy: users.slice(0, 10) });
  }
  if (name) {
    const q = name.toLowerCase();
    const hits = Object.entries(COUNTRIES).filter(([k, v]) => v.name.toLowerCase().includes(q)).slice(0, 20);
    if (!hits.length) return json(res, 404, { error: 'no country matches: ' + name });
    return json(res, 200, { query: name, results: hits.map(([code, v]) => ({ code, name: v.name, currency: v.currency, dialingCode: v.dial })) });
  }
  return json(res, 200, { endpoints: { '?country=US': 'ISO 3166 country lookup', '?currency=USD': 'ISO 4217 currency lookup', '?name=germany': 'country search by name' }, countries: Object.keys(COUNTRIES).length, currencies: Object.keys(CURRENCIES).length });
}
module.exports = { routeIso, COUNTRIES, CURRENCIES };
