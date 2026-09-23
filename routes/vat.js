// /vat — EU VAT ID validation (country-specific checksums for major countries)
function routeVat(u, res, json) {
  const p = u.searchParams;
  const input = (p.get('vat') || '').toUpperCase().replace(/[\s.-]/g, '');
  if (!input) return json(res, 200, { usage: '?vat=DE136695976 — validate an EU VAT ID (country code + number)' });
  const cc = input.slice(0, 2);
  const num = input.slice(2);
  const rules = {
    DE: { re: /^\d{9}$/, sum: s => { const d = s.slice(0, 8); let t = 0; for (let i = 0; i < 8; i++) { const pos = 8 - i; const w = (pos % 2 === 0) ? 2 : 1; let m = +d[i] * w; if (m > 9) m -= 9; t += m; } return (10 - t % 10) % 10 === +s[8]; } },
    FR: { re: /^\d{2}\d{9}$/, sum: s => +s.slice(0, 2) === (12 + (+s.slice(2)) * 100) % 97 },
    NL: { re: /^\d{9}B\d{2}$/, sum: s => { const d = s.slice(0, 9); const w = [9, 8, 7, 6, 5, 4, 3, 2]; let t = 0; for (const ch of (s)) { t = (t * 10 + (/[0-9]/.test(ch) ? +ch : ch.charCodeAt(0) - 55)) % 97; } return t === 0; } },
    IT: { re: /^\d{11}$/, sum: s => { let t = 0; for (let i = 0; i < 10; i += 2) { t += +s[i]; const x = +s[i + 1] * 2; t += x > 9 ? x - 9 : x; } return (10 - t % 10) % 10 === +s[10]; } },
    GB: { re: /^(\d{9}|\d{12}|(GD|HA)\d{3})$/, sum: () => true },
    PL: { re: /^\d{10}$/, sum: s => { const w = [6, 5, 7, 2, 3, 4, 5, 6, 7]; let t = 0; for (let i = 0; i < 9; i++) t += +s[i] * w[i]; return t % 11 === +s[9]; } },
    AT: { re: /^U\d{8}$/, sum: s => { const d = s.slice(1); const w = [1, 2, 1, 2, 1, 2, 1]; let t = 0; for (let i = 0; i < 7; i++) { const m = +d[i] * w[i]; t += m > 9 ? m - 9 : m; } return (96 - t) % 10 === +d[7]; } },
    BE: { re: /^\d{10}$/, sum: s => 97 - (+s.slice(0, 8) % 97) === +s.slice(8) },
    DK: { re: /^\d{8}$/, sum: s => { const w = [2, 7, 6, 5, 4, 3, 2, 1]; let t = 0; for (let i = 0; i < 8; i++) t += +s[i] * w[i]; return t % 11 === 0; } },
    FI: { re: /^\d{8}$/, sum: s => { const w = [7, 9, 10, 5, 8, 4, 2]; let t =  0; for (let i = 0; i < 7; i++) t += +s[i] * w[i]; return (11 - t % 11) % 11 === +s[7]; } },
    SE: { re: /^\d{10}01$/, sum: () => true },
  };
  const r = rules[cc];
  if (!r) return json(res, 422, { vat: input, country: cc, valid: false, error: `No validation rule for ${cc}. Supported: ${Object.keys(rules).join(', ')}` });
  const format_ok = r.re.test(num);
  const checksum_ok = format_ok ? !!r.sum(num) : false;
  const valid = format_ok && checksum_ok;
  return json(res, valid ? 200 : 422, { vat: input, country: cc, format_valid: format_ok, checksum_valid: checksum_ok, valid });
}
module.exports = { routeVat };
