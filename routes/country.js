// /country — ISO 3166 country lookup
const COUNTRIES = {
  US: { name: 'United States', capital: 'Washington, D.C.', currency: 'USD', phone: '1', tld: 'us' },
  GB: { name: 'United Kingdom', capital: 'London', currency: 'GBP', phone: '44', tld: 'uk' },
  DE: { name: 'Germany', capital: 'Berlin', currency: 'EUR', phone: '49', tld: 'de' },
  FR: { name: 'France', capital: 'Paris', currency: 'EUR', phone: '33', tld: 'fr' },
  JP: { name: 'Japan', capital: 'Tokyo', currency: 'JPY', phone: '81', tld: 'jp' },
  CN: { name: 'China', capital: 'Beijing', currency: 'CNY', phone: '86', tld: 'cn' },
  KR: { name: 'South Korea', capital: 'Seoul', currency: 'KRW', phone: '82', tld: 'kr' },
  IN: { name: 'India', capital: 'New Delhi', currency: 'INR', phone: '91', tld: 'in' },
  BR: { name: 'Brazil', capital: 'Brasília', currency: 'BRL', phone: '55', tld: 'br' },
  CA: { name: 'Canada', capital: 'Ottawa', currency: 'CAD', phone: '1', tld: 'ca' },
  AU: { name: 'Australia', capital: 'Canberra', currency: 'AUD', phone: '61', tld: 'au' },
  RU: { name: 'Russia', capital: 'Moscow', currency: 'RUB', phone: '7', tld: 'ru' },
  IT: { name: 'Italy', capital: 'Rome', currency: 'EUR', phone: '39', tld: 'it' },
  ES: { name: 'Spain', capital: 'Madrid', currency: 'EUR', phone: '34', tld: 'es' },
  NL: { name: 'Netherlands', capital: 'Amsterdam', currency: 'EUR', phone: '31', tld: 'nl' },
  SE: { name: 'Sweden', capital: 'Stockholm', currency: 'SEK', phone: '46', tld: 'se' },
  NO: { name: 'Norway', capital: 'Oslo', currency: 'NOK', phone: '47', tld: 'no' },
  DK: { name: 'Denmark', capital: 'Copenhagen', currency: 'DKK', phone: '45', tld: 'dk' },
  FI: { name: 'Finland', capital: 'Helsinki', currency: 'EUR', phone: '358', tld: 'fi' },
  CH: { name: 'Switzerland', capital: 'Bern', currency: 'CHF', phone: '41', tld: 'ch' },
  AT: { name: 'Austria', capital: 'Vienna', currency: 'EUR', phone: '43', tld: 'at' },
  BE: { name: 'Belgium', capital: 'Brussels', currency: 'EUR', phone: '32', tld: 'be' },
  PL: { name: 'Poland', capital: 'Warsaw', currency: 'PLN', phone: '48', tld: 'pl' },
  UA: { name: 'Ukraine', capital: 'Kyiv', currency: 'UAH', phone: '380', tld: 'ua' },
  TR: { name: 'Türkiye', capital: 'Ankara', currency: 'TRY', phone: '90', tld: 'tr' },
  EG: { name: 'Egypt', capital: 'Cairo', currency: 'EGP', phone: '20', tld: 'eg' },
  ZA: { name: 'South Africa', capital: 'Pretoria', currency: 'ZAR', phone: '27', tld: 'za' },
  NG: { name: 'Nigeria', capital: 'Abuja', currency: 'NGN', phone: '234', tld: 'ng' },
  KE: { name: 'Kenya', capital: 'Nairobi', currency: 'KES', phone: '254', tld: 'ke' },
  MX: { name: 'Mexico', capital: 'Mexico City', currency: 'MXN', phone: '52', tld: 'mx' },
  AR: { name: 'Argentina', capital: 'Buenos Aires', currency: 'ARS', phone: '54', tld: 'ar' },
  CL: { name: 'Chile', capital: 'Santiago', currency: 'CLP', phone: '56', tld: 'cl' },
  CO: { name: 'Colombia', capital: 'Bogotá', currency: 'COP', phone: '57', tld: 'co' },
  PE: { name: 'Peru', capital: 'Lima', currency: 'PEN', phone: '51', tld: 'pe' },
  SG: { name: 'Singapore', capital: 'Singapore', currency: 'SGD', phone: '65', tld: 'sg' },
  HK: { name: 'Hong Kong', capital: 'Hong Kong', currency: 'HKD', phone: '852', tld: 'hk' },
  TW: { name: 'Taiwan', capital: 'Taipei', currency: 'TWD', phone: '886', tld: 'tw' },
  TH: { name: 'Thailand', capital: 'Bangkok', currency: 'THB', phone: '66', tld: 'th' },
  VN: { name: 'Vietnam', capital: 'Hanoi', currency: 'VND', phone: '84', tld: 'vn' },
  MY: { name: 'Malaysia', capital: 'Kuala Lumpur', currency: 'MYR', phone: '60', tld: 'my' },
  ID: { name: 'Indonesia', capital: 'Jakarta', currency: 'IDR', phone: '62', tld: 'id' },
  PH: { name: 'Philippines', capital: 'Manila', currency: 'PHP', phone: '63', tld: 'ph' },
  PK: { name: 'Pakistan', capital: 'Islamabad', currency: 'PKR', phone: '92', tld: 'pk' },
  BD: { name: 'Bangladesh', capital: 'Dhaka', currency: 'BDT', phone: '880', tld: 'bd' },
  SA: { name: 'Saudi Arabia', capital: 'Riyadh', currency: 'SAR', phone: '966', tld: 'sa' },
  AE: { name: 'United Arab Emirates', capital: 'Abu Dhabi', currency: 'AED', phone: '971', tld: 'ae' },
  IL: { name: 'Israel', capital: 'Jerusalem', currency: 'ILS', phone: '972', tld: 'il' },
  NZ: { name: 'New Zealand', capital: 'Wellington', currency: 'NZD', phone: '64', tld: 'nz' },
  IE: { name: 'Ireland', capital: 'Dublin', currency: 'EUR', phone: '353', tld: 'ie' },
  PT: { name: 'Portugal', capital: 'Lisbon', currency: 'EUR', phone: '351', tld: 'pt' },
  GR: { name: 'Greece', capital: 'Athens', currency: 'EUR', phone: '30', tld: 'gr' },
  CZ: { name: 'Czech Republic', capital: 'Prague', currency: 'CZK', phone: '420', tld: 'cz' },
  RO: { name: 'Romania', capital: 'Bucharest', currency: 'RON', phone: '40', tld: 'ro' },
  HU: { name: 'Hungary', capital: 'Budapest', currency: 'HUF', phone: '36', tld: 'hu' },
};

function routeCountry(u, res, json) {
  const q = u.searchParams;
  const code = (q.get('code') || '').toUpperCase().trim();
  const query = (q.get('q') || '').toLowerCase().trim();

  if (!code && !query) return json(res, 200, { count: Object.keys(COUNTRIES).length, countries: COUNTRIES });
  if (code) {
    const c = COUNTRIES[code];
    if (!c) return json(res, 404, { error: `unknown country code: ${code}` });
    return json(res, 200, { code, ...c });
  }
  const matches = Object.entries(COUNTRIES)
    .filter(([k, v]) => v.name.toLowerCase().includes(query) || k.toLowerCase() === query)
    .map(([k, v]) => ({ code: k, ...v }));
  if (!matches.length) return json(res, 404, { error: `no match for: ${query}` });
  return json(res, 200, { count: matches.length, results: matches });
}
module.exports = { routeCountry };
