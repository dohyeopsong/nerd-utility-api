// /swift — SWIFT/BIC code validation (ISO 9362)
function routeSwift(u, res, json) {
  const code = (u.searchParams.get('bic') || u.searchParams.get('swift') || '').replace(/\s+/g, '').toUpperCase();
  if (!code) return json(res, 200, { usage: '?bic=DEUTDEFF500 — validate a SWIFT/BIC: 8 or 11 chars, bank code, country ISO-3166-1, location, optional branch' });
  const out = { bic: code };
  if (!/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(code))
    return json(res, 400, { ...out, valid: false, error: 'bad format: 8 or 11 chars — 4 letters (bank), 2 letters (country), 2 alnum (location), optional 3 alnum (branch)' });
  out.valid = true;
  out.bank = code.slice(0, 4);
  out.country = code.slice(4, 6);
  out.location = code.slice(6, 8);
  out.length = code.length;
  out.type = code.length === 8 ? 'primary office (BIC8)' : 'branch (BIC11)';
  if (code.length === 11) out.branch = code.slice(8, 11);
  if (code[7] === '0') out.note = 'location char 2 = 0: deprecated/test BIC';
  if (code.length === 11 && code.slice(8) === 'XXX') out.note = 'branch XXX: primary office';
  return json(res, 200, out);
}
module.exports = { routeSwift };
