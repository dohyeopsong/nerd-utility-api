// /vat — European VAT number validation with per-country checksum rules (structural, offline)
const RULES = {
  AT: { name: 'Austria', re: /^U\d{8}$/, fn: s => { const d = s.slice(1).split('').map(Number); let c = 10; for (let i = 0; i < 7; i++) { c = (Math.floor((d[i] + c) % 10) || 10) * 2 % 11; } return (11 - c) % 10 === d[7]; } },
  BE: { name: 'Belgium', re: /^0\d{9}$/, fn: s => { const d = s.split('').map(Number); let mod = 97 - (Number(s.slice(0, 8)) % 97); return mod === Number(s.slice(8)); } },
  DE: { name: 'Germany', re: /^\d{9}$/, fn: s => { const d = s.split('').map(Number); let prod = 10; for (let i = 0; i < 8; i++) { let t = (prod + d[i]) % 10; if (t === 0) t = 10; prod = (2 * t) % 11; } const chk = (11 - prod) % 10; return chk === d[8]; } },
  DK: { name: 'Denmark', re: /^\d{8}$/, fn: s => { const w = [2, 7, 6, 5, 4, 3, 2, 1]; const d = s.split('').map(Number); return d.reduce((a, x, i) => a + x * w[i], 0) % 11 === 0; } },
  ES: { name: 'Spain', re: /^[\dA-Z]\d{7}[\dA-Z]$/, fn: () => null }, // complex control char rules — structure only
  FI: { name: 'Finland', re: /^\d{8}$/, fn: s => { const w = [7, 9, 10, 5, 8, 4, 2, 1]; const d = s.split('').map(Number); return d.reduce((a, x, i) => a + x * w[i], 0) % 11 === 0; } },
  FR: { name: 'France', re: /^\d{11}$/, fn: () => null }, // mod 97 on first 10 digits vs last 2 — keep structural only
  GB: { name: 'United Kingdom', re: /^\d{9}$|^\d{12}$|^GD\d{3}$|^HA\d{3}$/, fn: () => null },
  GR: { name: 'Greece', re: /^\d{9}$/, fn: () => null },
  IE: { name: 'Ireland', re: /^[\dA-Z]{7}[A-W]$/i, fn: () => null },
  IT: { name: 'Italy', re: /^\d{11}$/, fn: s => luhnIT(s) },
  NL: { name: 'Netherlands', re: /^\d{9}B\d{2}$/, fn: s => { const d = s.slice(0, 9).split('').map(Number); const w = [9, 8, 7, 6, 5, 4, 3, 2]; let sum = d.slice(0, 8).reduce((a, x, i) => a + x * w[i], 0); return (sum - 1) % 11 === d[8]; } },
  PL: { name: 'Poland', re: /^\d{10}$/, fn: s => { const w = [6, 5, 7, 2, 3, 4, 5, 6, 7]; const d = s.split('').map(Number); const sum = d.slice(0, 9).reduce((a, x, i) => a + x * w[i], 0); return sum % 11 === d[9]; } },
  PT: { name: 'Portugal', re: /^\d{9}$/, fn: s => { const w = [9, 8, 7, 6, 5, 4, 3, 2]; const d = s.split('').map(Number); const sum = d.slice(0, 8).reduce((a, x, i) => a + x * w[i], 0); const r = 11 - (sum % 11); return (r >= 10 ? 0 : r) === d[8]; } },
  SE: { name: 'Sweden', re: /^\d{10}01$/, fn: s => { const d = s.slice(0, 10).split('').map(Number); let sum = 0; for (let i = 0; i < 10; i++) { let x = d[i]; if (i % 2 === 1) { x *= 2; if (x > 9) x -= 9; } sum += x; } return sum % 10 === 0; } },
  SI: { name: 'Slovenia', re: /^\d{8}$/, fn: s => { const w = [8, 7, 6, 5, 4, 3, 2]; const d = s.split('').map(Number); const sum = d.slice(0, 7).reduce((a, x, i) => a + x * w[i], 0); const r = 11 - (sum % 11); return (r === 10 ? 0 : r) === d[7]; } },
  SK: { name: 'Slovakia', re: /^\d{10}$/, fn: () => null },
  LU: { name: 'Luxembourg', re: /^\d{8}$/, fn: s => Number(s.slice(0, 6)) % 89 === Number(s.slice(6)) },
  HU: { name: 'Hungary', re: { 8: /^\d{8}$/ }, fn: () => null },
  CY: { name: 'Cyprus', re: /^\d{8}[A-Z]$/, fn: () => null },
  MT: { name: 'Malta', re: /^\d{8}$/, fn: () => null },
  LT: { name: 'Lithuania', re: /^\d{9}$|^\d{12}$/, fn: () => null },
  LV: { name: 'Latvia', re: /^\d{11}$/, fn: () => null },
  EE: { name: 'Estonia', re: /^\d{9}$/, fn: () => null },
  HR: { name: 'Croatia', re: /^\d{11}$/, fn: () => null },
  BG: { name: 'Bulgaria', re: /^\d{9,10}$/, fn: () => null },
  RO: { name: 'Romania', re: /^\d{2,10}$/, fn: () => null },
  CZ: { name: 'Czechia', re: /^\d{8,10}$/, fn: () => null }
};

function luhnIT(s) {
  // Italian VAT: Luhn-like on odd/even positions (1-indexed), check char = last
  const d = s.slice(0, 10).split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    let x = d[i];
    if (i % 2 === 1) { // even positions (1-indexed 2,4,...)
      const t = x * 2; sum += Math.floor(t / 10) + (t % 10);
    } else {
      sum += x;
    }
  }
  const chk = (10 - (sum % 10)) % 10;
  return chk === Number(s[10]);
}

function routeVat(u, res, json) {
  const q = u.searchParams;
  const cc = (q.get('country') || '').trim().toUpperCase();
  const num = (q.get('check') || '').trim().toUpperCase();

  if (!cc && !num) {
    return json(res, 400, {
      error: 'provide ?country=DE&check=136695976',
      note: 'validates structure and checksum (where defined). Real-time registry check requires VIES.',
      supported_countries: Object.keys(RULES)
    });
  }
  if (!cc) return json(res, 400, { error: 'provide ?country= (ISO 3166-1 alpha-2)' });
  if (!num) return json(res, 400, { error: 'provide ?check=' });

  const out = { input: num, country: cc };

  if (!(cc in RULES)) {
    out.valid = false;
    out.reason = `unsupported country: ${cc}`;
    out.supported_countries = Object.keys(RULES);
    return json(res, 200, out);
  }

  const r = RULES[cc];
  out.country_name = r.name;

  // format check
  const re = r.re instanceof RegExp ? r.re : (r.re[num.length] || null);
  if (!re || !re.test(num)) {
    out.valid = false;
    out.reason = `does not match ${cc} VAT format`;
    return json(res, 200, out);
  }

  // checksum (if implemented for this country)
  const chk = r.fn(num);
  if (chk === null) {
    out.valid = true;
    out.checksum_verified = false;
    out.note = 'format valid; no checksum rule implemented for this country';
  } else {
    out.checksum_verified = true;
    out.valid = chk;
    if (!chk) out.reason = 'checksum failed';
  }
  return json(res, 200, out);
}

module.exports = { routeVat };
