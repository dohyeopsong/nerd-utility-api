// /swift — SWIFT/BIC code format validation + structure parse
function routeSwift(u, res, json) {
  const raw = (u.searchParams.get('bic') || '').replace(/\s/g, '').toUpperCase();
  if (!raw) return json(res, 200, { usage: '?bic=DEUTDEFF500 — SWIFT/BIC validation with structure parse' });
  // 8 or 11 chars: 4 bank + 2 country + 2 location + optional 3 branch
  if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(raw)) {
    return json(res, 400, { input: raw, valid: false, error: 'must be 8 or 11 chars: BBBBCCLL[BBB] (letters/digits)' });
  }
  const out = {
    input: raw, valid: true,
    bank_code: raw.slice(0, 4),
    country: raw.slice(4, 6),
    location_code: raw.slice(6, 8),
    length: raw.length,
  };
  if (raw.length === 11) out.branch_code = raw.slice(8, 11);
  out.type = raw.length === 8 ? 'primary office' : 'specific branch';
  if (raw.length === 8) out.branch_code = 'XXX';
  // location code conventions
  const lc = raw.slice(6, 8);
  if (lc[0] === '0') out.passive_participant = true;
  if (lc[1] === '0' && lc[0] !== '0') out.test_bic = true; // BIC ending 0 in position 8
  return json(res, 200, out);
}
module.exports = { routeSwift };
