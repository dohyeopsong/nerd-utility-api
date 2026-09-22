// /swift — SWIFT/BIC validation: 8/11-char code, bank/country/location/branch parsing
function routeSwift(u, res, json) {
  const q = u.searchParams;
  const raw = (q.get('check') || '').trim().toUpperCase();

  if (!raw) {
    return json(res, 400, {
      error: 'provide ?check=DEUTDEFF',
      example: '/swift?check=DEUTDEFF500',
      note: '8-char primary office BIC or 11-char with branch code'
    });
  }

  const out = { input: raw };

  if (!/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(raw)) {
    out.valid = false;
    out.reason = raw.length === 8 || raw.length === 11
      ? 'contains invalid characters (bank code must be letters; location can be alphanumeric)'
      : `expected 8 or 11 characters, got ${raw.length}`;
    return json(res, 200, out);
  }

  out.valid = true;
  out.bank_code = raw.slice(0, 4);
  out.country = raw.slice(4, 6);
  out.location_code = raw.slice(6, 8);
  out.branch_code = raw.length === 11 ? raw.slice(8) : null;
  out.primary_office = raw.length === 8 || raw.slice(8) === 'XXX';
  out.length = raw.length;

  out.note = out.primary_office
    ? 'primary office (no distinct branch code or XXX)'
    : `specific branch: ${out.branch_code}`;

  return json(res, 200, out);
}

module.exports = { routeSwift };
