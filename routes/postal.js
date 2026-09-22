// /postal — postal/ZIP code validation for major countries (structure only)
const FORMATS = {
  US: { name: 'United States', re: /^\d{5}(-\d{4})?$/, example: '94105 or 94105-1234' },
  CA: { name: 'Canada', re: /^[A-Z]\d[A-Z] ?\d[A-Z]\d$/, example: 'K1A 0B1' },
  GB: { name: 'United Kingdom', re: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/, example: 'SW1A 1AA (special cases GIR 0AA not covered)' },
  DE: { name: 'Germany', re: /^\d{5}$/, example: '10115' },
  FR: { name: 'France', re: /^\d{5}$/, example: '75001' },
  IT: { name: 'Italy', re: /^\d{5}$/, example: '00100' },
  ES: { name: 'Spain', re: /^\d{5}$/, example: '28001' },
  NL: { name: 'Netherlands', re: /^\d{4} ?[A-Z]{2}$/, example: '1012 AB' },
  BE: { name: 'Belgium', re: /^\d{4}$/, example: '1000' },
  AT: { name: 'Austria', re: /^\d{4}$/, example: '1010' },
  CH: { name: 'Switzerland', re: /^\d{4}$/, example: '8001' },
  SE: { name: 'Sweden', re: /^\d{3} ?\d{2}$/, example: '114 55' },
  NO: { name: 'Norway', re: /^\d{4}$/, example: '0150' },
  DK: { name: 'Denmark', re: /^\d{4}$/, example: '1050' },
  FI: { name: 'Finland', re: /^\d{5}$/, example: '00100' },
  PL: { name: 'Poland', re: /^\d{2}-\d{3}$/, example: '00-950' },
  CZ: { name: 'Czechia', re: /^\d{3} ?\d{2}$/, example: '110 00' },
  PT: { name: 'Portugal', re: /^\d{4}-\d{3}$/, example: '1000-001' },
  IE: { name: 'Ireland', re: /^[A-Z\d]{3} ?[A-Z\d]{4}$/, example: 'D02 X285' },
  AU: { name: 'Australia', re: /^\d{4}$/, example: '2000' },
  NZ: { name: 'New Zealand', re: /^\d{4}$/, example: '6011' },
  JP: { name: 'Japan', re: /^\d{3}-\d{4}$/, example: '100-0001' },
  CN: { name: 'China', re: /^\d{6}$/, example: '100000' },
  KR: { name: 'South Korea', re: /^\d{5}$/, example: '04524' },
  IN: { name: 'India', re: /^\d{6}$/, example: '110001' },
  BR: { name: 'Brazil', re: /^\d{5}-?\d{3}$/, example: '01001-000' },
  MX: { name: 'Mexico', re: /^\d{5}$/, example: '01000' },
  ZA: { name: 'South Africa', re: /^\d{4}$/, example: '8001' },
  RU: { name: 'Russia', re: /^\d{6}$/, example: '101000' }
};

function routePostal(u, res, json) {
  const q = u.searchParams;
  const cc = (q.get('country') || '').trim().toUpperCase();
  const code = (q.get('check') || '').trim().toUpperCase();

  if (!cc && !code) {
    return json(res, 400, {
      error: 'provide ?country=US&check=94105',
      example: '/postal?country=CA&check=K1A 0B1',
      supported_countries: Object.keys(FORMATS)
    });
  }
  if (!cc) return json(res, 400, { error: 'provide ?country= (ISO 3166-1 alpha-2)' });
  if (!code) return json(res, 400, { error: 'provide ?check=' });

  const out = { input: code, country: cc };

  if (!(cc in FORMATS)) {
    out.valid = false;
    out.reason = `unsupported country: ${cc}`;
    out.supported_countries = Object.keys(FORMATS);
    return json(res, 200, out);
  }

  const f = FORMATS[cc];
  out.country_name = f.name;
  out.expected_format = f.example;
  out.valid = f.re.test(code);
  if (!out.valid) out.reason = `does not match ${cc} postal format`;
  return json(res, 200, out);
}

module.exports = { routePostal };
