// /swift — SWIFT/BIC code validation and parsing
// BIC: 8 or 11 chars — 4 letter bank, 2 letter country, 2 alnum location, optional 3 alnum branch
const COUNTRY_CODES = new Set('AD AE AG AI AL AM AO AR AT AU AW AZ BA BB BE BF BG BH BI BJ BM BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CW CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GQ GR GT GW GY HK HN HR HT HU ID IE IL IM IN IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MQ MR MT MU MV MW MX MY MZ NA NC NE NG NI NL NO NP NR NZ OM PA PE PF PG PH PK PL PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TG TH TJ TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VG VI VN VU WS YE ZA ZM ZW'.split(' '));
function routeSwift(u, res, json) {
  const p = u.searchParams;
  const raw = p.get('bic') || p.get('swift');
  if (!raw) return json(res, 200, { usage: '?bic=DEUTDEFF500 — validates SWIFT/BIC (8 or 11 chars): bank, country, location, branch' });
  const bic = raw.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic)) {
    return json(res, 400, { error: 'invalid BIC format: need 4 letters bank + 2 letters country + 2 alnum location (+ optional 3 alnum branch)', bic });
  }
  const bank = bic.slice(0, 4);
  const country = bic.slice(4, 6);
  const location = bic.slice(6, 8);
  const branch = bic.length === 11 ? bic.slice(8) : null;
  const countryCodeOk = COUNTRY_CODES.has(country);
  const primaryOffice = branch === 'XXX' || branch === null;
  let warnings = [];
  if (!countryCodeOk) warnings.push('country code not in ISO 3166-1 alpha-2 list');
  return json(res, 200, {
    bic,
    bank,
    country,
    country_code_valid: countryCodeOk,
    location,
    branch,
    type: primaryOffice ? 'primary office' : 'branch/specific location',
    length: bic.length,
    valid: true,
    warnings,
  });
}
module.exports = { routeSwift };
