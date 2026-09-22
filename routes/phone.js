// /phone — international phone number parsing and formatting (E.164-ish)
// Simplified offline parser for common country prefixes.

// Country calling codes, longest-first matching
const DIAL_CODES = [
  ['1', ['US', 'CA']],
  ['7', ['RU', 'KZ']],
  ['20', ['EG']],
  ['27', ['ZA']],
  ['30', ['GR']],
  ['31', ['NL']],
  ['32', ['BE']],
  ['33', ['FR']],
  ['34', ['ES']],
  ['36', ['HU']],
  ['39', ['IT']],
  ['40', ['RO']],
  ['41', ['CH']],
  ['43', ['AT']],
  ['44', ['GB']],
  ['45', ['DK']],
  ['46', ['SE']],
  ['47', ['NO']],
  ['48', ['PL']],
  ['49', ['DE']],
  ['51', ['PE']],
  ['52', ['MX']],
  ['53', ['CU']],
  ['54', ['AR']],
  ['55', ['BR']],
  ['56', ['CL']],
  ['57', ['CO']],
  ['60', ['MY']],
  ['61', ['AU']],
  ['62', ['ID']],
  ['63', ['PH']],
  ['64', ['NZ']],
  ['65', ['SG']],
  ['66', ['TH']],
  ['81', ['JP']],
  ['82', ['KR']],
  ['84', ['VN']],
  ['86', ['CN']],
  ['90', ['TR']],
  ['91', ['IN']],
  ['92', ['PK']],
  ['93', ['AF']],
  ['94', ['LK']],
  ['98', ['IR']],
  ['212', ['MA']],
  ['213', ['DZ']],
  ['216', ['TN']],
  ['218', ['LY']],
  ['220', ['GM']],
  ['234', ['NG']],
  ['254', ['KE']],
  ['256', ['UG']],
  ['258', ['MZ']],
  ['260', ['ZM']],
  ['263', ['ZW']],
  ['351', ['PT']],
  ['352', ['LU']],
  ['353', ['IE']],
  ['355', ['AL']],
  ['358', ['FI']],
  ['359', ['BG']],
  ['370', ['LT']],
  ['371', ['LV']],
  ['372', ['EE']],
  ['380', ['UA']],
  ['385', ['HR']],
  ['420', ['CZ']],
  ['421', ['SK']],
  ['852', ['HK']],
  ['853', ['MO']],
  ['855', ['KH']],
  ['856', ['LA']],
  ['880', ['BD']],
  ['886', ['TW']],
  ['960', ['MV']],
  ['961', ['LB']],
  ['962', ['JO']],
  ['963', ['SY']],
  ['964', ['IQ']],
  ['965', ['KW']],
  ['966', ['SA']],
  ['971', ['AE']],
  ['972', ['IL']],
  ['973', ['BH']],
  ['974', ['QA']],
  ['975', ['BT']],
  ['976', ['MN']],
  ['977', ['NP']],
  ['995', ['GE']],
  ['998', ['UZ']],
];

// E.164 max 15 digits; typical national numbers 6-13 digits after dial code
function routePhone(u, res, json) {
  const q = u.searchParams;
  const raw = (q.get('number') || q.get('phone') || '').trim();
  if (!raw) return json(res, 400, { error: 'provide ?number=+81312345678' });

  // strip formatting chars
  const digits = raw.replace(/[\s().-]/g, '');
  const hasPlus = digits.startsWith('+');
  const e164 = hasPlus ? digits : ('+' + digits);

  if (!/^\+\d{7,15}$/.test(e164)) {
    return json(res, 400, { error: 'invalid phone number format (E.164: 7-15 digits after +)' });
  }
  const digitStr = e164.slice(1);

  // longest-prefix match on dial code
  let matched = null;
  for (const [code, countries] of DIAL_CODES) {
    if (digitStr.startsWith(code) && digitStr.length > code.length) {
      matched = { code, countries };
      break; // list is ordered roughly shortest-first? no — take longest: iterate carefully
    }
  }
  // redo properly: find longest match
  let best = null;
  for (const [code, countries] of DIAL_CODES) {
    if (digitStr.startsWith(code) && digitStr.length > code.length) {
      if (!best || code.length > best.code.length) best = { code, countries };
    }
  }

  if (!best) return json(res, 400, { error: 'unknown country dial code' });

  const national = digitStr.slice(best.code.length);
  const out = {
    input: raw,
    e164: e164,
    valid: true,
    dial_code: best.code,
    country_codes: best.countries,
    national_number: national,
    digits_total: digitStr.length,
  };
  return json(res, 200, out);
}
module.exports = { routePhone };
