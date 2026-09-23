// /isrc — International Standard Recording Code (ISRC) validation & parsing
function routeIsrc(u, res, json) {
  const p = u.searchParams;
  const raw = (p.get('isrc') || p.get('code') || '').trim();
  if (!raw) return json(res, 200, { usage: '?isrc=US-S1Z-99-00001 — validate & parse ISRC (hyphens optional)' });
  const s = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (s.length !== 12) return json(res, 400, { valid: false, error: `ISRC must be 12 alphanumeric chars, got ${s.length}` });
  if (!/^[A-Z]{2}/.test(s)) return json(res, 400, { valid: false, error: 'country code must be 2 letters' });
  if (!/^[A-Z0-9]{3}/.test(s.slice(2, 5))) return json(res, 400, { valid: false, error: 'registrant code must be 3 alphanumerics' });
  if (!/^\d{2}$/.test(s.slice(5, 7))) return json(res, 400, { valid: false, error: 'year must be 2 digits' });
  if (!/^\d{5}$/.test(s.slice(7))) return json(res, 400, { valid: false, error: 'designation code must be 5 digits' });
  const year2 = +s.slice(5, 7);
  return json(res, 200, {
    valid: true,
    formatted: `${s.slice(0, 2)}-${s.slice(2, 5)}-${s.slice(5, 7)}-${s.slice(7)}`,
    country_code: s.slice(0, 2),
    registrant_code: s.slice(2, 5),
    year: `19${String(year2).padStart(2,'0')} or 20${String(year2).padStart(2,'0')} (2-digit year, ambiguous)`,
    year_2digit: s.slice(5, 7),
    designation_code: s.slice(7),
  });
}
module.exports = { routeIsrc };
