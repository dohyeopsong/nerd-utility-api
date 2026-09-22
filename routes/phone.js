// /phone — international phone number validation (E.164 format, country prefix + length rules, best-effort)
const COUNTRY_PHONES = {
  // cc: [dial code, typical significant number length range]
  US: ['1', 10], CA: ['1', 10], GB: ['44', 10], DE: ['49', [10, 11]], FR: ['33', 9], IT: ['39', [9, 11]],
  ES: ['34', 9], NL: ['31', 9], BE: ['32', [8, 9]], AT: ['43', [10, 11]], CH: ['41', 9], SE: ['46', [7, 9]],
  NO: ['47', 8], DK: ['45', 8], FI: ['358', [9, 10]], PL: ['48', 9], CZ: ['420', 9], PT: ['351', 9],
  IE: ['353', 9], GR: ['30', 10], TR: ['90', 10], RU: ['7', 10], UA: ['380', 9], AU: ['61', 9],
  NZ: ['64', [8, 10]], JP: ['81', [9, 10]], CN: ['86', 11], KR: ['82', [9, 10]], IN: ['91', 10],
  BR: ['55', [10, 11]], MX: ['52', 10], AR: ['54', 10], ZA: ['27', 9], EG: ['20', 10], NG: ['234', 10],
  AE: ['971', 9], SA: ['966', 9], IL: ['972', 9], SG: ['65', [8, 9]], HK: ['852', 8], MY: ['60', [9, 10]],
  ID: ['62', [9, 12]], TH: ['66', 9], VN: ['84', [9, 10]], PH: ['63', 10], PK: ['92', 10], BD: ['880', 10]
};

const DIAL_TO_CC = {};
for (const [cc, [dial]] of Object.entries(COUNTRY_PHONES)) {
  (DIAL_TO_CC[dial] = DIAL_TO_CC[dial] || []).push(cc);
}

function routePhone(u, res, json) {
  const q = u.searchParams;
  const raw = (q.get('check') || '').trim();
  if (!raw) return json(res, 400, { error: 'provide ?check=%2B4915112345678', example: '/phone?check=+14155551234' });

  const out = { input: raw };

  // normalize: strip spaces, dashes, parens, dots
  let digits = raw.replace(/[\s().-]/g, '');
  let hasPlus = digits.startsWith('+');
  digits = digits.replace(/^\+/, '').replace(/\D/g, '');

  if (!digits) {
    out.valid = false; out.reason = 'no digits found';
    return json(res, 200, out);
  }
  if (digits.length > 15) {
    out.valid = false; out.reason = `too long for E.164 (max 15 digits, got ${digits.length})`;
    return json(res, 200, out);
  }
  if (!hasPlus) {
    out.valid = false; out.reason = 'expected international format with leading + (E.164)';
    out.normalized = '+' + digits;
    return json(res, 200, out);
  }

  out.e164 = '+' + digits;

  // match dial code (longest first)
  const dials = Object.keys(DIAL_TO_CC).sort((a, b) => b.length - a.length);
  let matched = null;
  for (const d of dials) {
    if (digits.startsWith(d)) { matched = d; break; }
  }
  if (!matched) {
    out.valid = false; out.reason = 'unknown country dial code';
    return json(res, 200, out);
  }

  out.dial_code = '+' + matched;
  out.possible_countries = DIAL_TO_CC[matched];
  const significant = digits.slice(matched.length);
  out.subscriber_number_length = significant.length;

  // length check against first candidate country (best effort)
  const cc = out.possible_countries[0];
  out.country = cc;
  const lenRule = COUNTRY_PHONES[cc][1];
  const lens = Array.isArray(lenRule) ? lenRule : [lenRule];
  out.expected_lengths = { country: cc, significant: lens };
  if (!lens.includes(significant.length)) {
    out.valid = false;
    out.reason = `significant number length ${significant.length} unusual for ${cc} (expected ${lens.join(' or ')})`;
    return json(res, 200, out);
  }

  out.valid = true;
  out.note = 'structural validation only — carrier/type detection requires a lookup service (e.g. libphonenumber)';
  return json(res, 200, out);
}

module.exports = { routePhone };
