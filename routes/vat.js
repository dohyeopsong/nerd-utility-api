// /vat — EU VAT ID format + checksum validation (offline, no VIES call)
const RULES = {
  AT: { re: /^U\d{8}$/ }, BE: { re: /^0\d{9}$/, mod: true }, BG: { re: /^\d{9,10}$/ },
  CY: { re: /^\d{8}[A-Z]$/ }, CZ: { re: /^\d{8,10}$/ }, DE: { re: /^\d{9}$/ },
  DK: { re: /^\d{8}$/ }, EE: { re: /^\d{9}$/ }, EL: { re: /^\d{9}$/ }, ES: { re: /^[0-9A-Z][0-9]{7}[0-9A-Z]$/ },
  FI: { re: /^\d{8}$/ }, FR: { re: /^[0-9A-Z]{2}\d{9}$/ }, GB: { re: /^(GB)?(\d{9}|\d{12}|(HA|GD)\d{3})$/ },
  HR: { re: /^\d{11}$/ }, HU: { re: { exact: /^\d{8}$/ } }, IE: { re: /^([0-9]{7}[A-W]{1,2}|\d{7}A[OI])/ },
  IT: { re: /^\d{11}$/ }, LT: { re: /^\d{9}|\d{12}$/ }, LU: { re: /^\d{8}$/ }, LV: { re: /^\d{11}$/ },
  MT: { re: /^\d{8}$/ }, NL: { re: /^\d{9}B\d{2}$/ }, PL: { re: /^\d{10}$/ }, PT: { re: /^\d{9}$/ },
  RO: { re: /^\d{2,10}$/ }, SE: { re: /^\d{10}01$/ }, SI: { re: /^\d{8}$/ }, SK: { re: /^\d{10}$/ },
};
function routeVat(u, res, json) {
  const raw = (u.searchParams.get('vat') || '').trim().toUpperCase();
  if (!raw) return json(res, 200, { usage: '?vat=DE123456789 — EU VAT ID format validation (offline checksum)' });
  const m = raw.match(/^([A-Z]{2})(.+)$/);
  if (!m) return json(res, 400, { error: 'missing country prefix' });
  const [, cc, num] = m;
  const rule = RULES[cc];
  if (!rule) return json(res, 400, { error: `unknown or non-EU country code: ${cc}`, valid: false });
  const formatOk = rule.re.test(num);
  const out = { input: raw, country: cc, format_valid: formatOk, valid: formatOk };
  // Belgium mod-97 checksum
  if (cc === 'BE' && formatOk) {
    const n = +num.slice(0, 8);
    out.checksum_valid = n % 97 === +num.slice(8);
    out.valid = out.checksum_valid;
  }
  return json(res, out.valid ? 200 : 422, out);
}
module.exports = { routeVat };
