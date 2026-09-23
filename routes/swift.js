// /swift — SWIFT/BIC code validation (ISO 9362)
function routeSwift(u, res, json) {
  const code = (u.searchParams.get('code') || '').replace(/\s+/g, '').toUpperCase();
  if (!code) return json(res, 200, { usage: '?code=DEUTDEFF — validates SWIFT/BIC (ISO 9362): 8 or 11 chars, bank+country+location+optional branch' });
  const out = { code };
  if (!/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(code)) {
    return json(res, 400, { ...out, valid: false, error: 'must be 8 or 11 chars: 4-letter bank code + 2-letter country + 2-char location + optional 3-char branch' });
  }
  out.bank_code = code.slice(0, 4);
  out.country = code.slice(4, 6);
  out.location = code.slice(6, 8);
  if (code.length === 11) out.branch = code.slice(8, 11);
  // location/branch conventions
  if (code[7] === '0' && code[6] !== '0') out.note = 'location ends in 0 — SEDOL/BIC test code (live payments should use XXX primary office)';
  else if (code[6] === '0' && code[7] === '0') out.note = 'location code 00 — payment center';
  else if (code[7] === 'B') out.note = 'location ends in B — branch office';
  if (code.length === 11 && code.endsWith('XXX')) out.branch_meaning = 'XXX — primary office';
  out.valid = true;
  return json(res, 200, out);
}
module.exports = { routeSwift };
