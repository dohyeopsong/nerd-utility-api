// /swift — SWIFT/BIC code validation and parsing
// Format: 8 or 11 chars: 4-letter bank code, 2-letter ISO country, 2 alphanumeric location, optional 3 alphanumeric branch code
const COUNTRY_OK = /^[A-Z]{2}$/;

function routeSwift(u, res, json) {
  const q = u.searchParams;
  const code = (q.get('check') || '').replace(/\s+/g, '').toUpperCase();
  if (!code) return json(res, 400, { error: 'provide ?check=DEUTDEFF500', example: '/swift?check=DEUTDEFF' });

  const out = { input: code };

  if (!/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(code)) {
    out.valid = false;
    out.reason = 'malformed structure (expect 8 or 11 chars: 4-letter bank + 2-letter country + 2-char location [+ 3-char branch])';
    return json(res, 200, out);
  }

  out.bank_code = code.slice(0, 4);
  out.country = code.slice(4, 6);
  out.location_code = code.slice(6, 8);
  out.branch_code = code.length === 11 ? code.slice(8, 11) : null;
  out.primary_office = code.length === 8;

  const c = out.country;
  if (!COUNTRY_OK.test(c) || c === 'XX') {
    out.valid = false;
    out.reason = 'invalid ISO 3166-1 alpha-2 country code';
    return json(res, 200, out);
  }

  // location code semantics (ISO 9362)
  const loc = out.location_code;
  const second = loc[1];
  let loc_note = null;
  if (second === '0') loc_note = 'city/placement code ending in 0 typically indicates a generic/primary location (not a city)';
  else if (/[1-9]/.test(second)) loc_note = `time zone reference: UTC${second <= '4' ? '+' + second : second === '9' ? '-1' : '+' + (second - 1)}`;
  out.location_note = loc_note;

  // branch code semantics
  if (out.branch_code === 'XXX') out.branch_note = 'XXX means primary office';
  else if (out.branch_code && /^[A-Z]/.test(out.branch_code)) out.branch_note = 'letter-initial branch code: alternate location in the same city';

  out.valid = true;
  out.format = code.length === 11 ? 'BIC11' : 'BIC8';
  return json(res, 200, out);
}

module.exports = { routeSwift };
