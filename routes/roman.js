// Roman numeral <-> integer converter with validation
const MAP = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
function toRoman(n) {
  n = Math.floor(n);
  if (!Number.isFinite(n) || n < 1 || n > 3999) return { error: 'number must be an integer between 1 and 3999' };
  let out = '';
  for (const [v, s] of MAP) while (n >= v) { out += s; n -= v; }
  return out;
}
function fromRoman(r) {
  const s = String(r || '').toUpperCase().trim();
  if (!/^[MDCLXVI]+$/.test(s)) return { error: 'invalid characters (use M, D, C, L, X, V, I only)' };
  const val = { I:1, V:5, X:10, L:50, C:100, D:500, M:1000 };
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const c = val[s[i]], n = val[s[i+1]] || 0;
    total += c < n ? -c : c;
  }
  // strict canonical check: re-encode and compare
  const canonical = toRoman(total);
  return { value: total, valid: canonical === s, canonicalForm: canonical };
}
function routeRoman(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  if (q.to) {
    const n = parseInt(q.to, 10);
    const r = toRoman(n);
    return json(res, 200, r.error ? { error: r.error } : { number: n, roman: r });
  }
  if (q.from) {
    const r = fromRoman(q.from);
    return json(res, 200, r.error ? r : { roman: String(q.from).toUpperCase().trim(), integer: r.value, valid: r.valid, canonicalForm: r.canonicalForm });
  }
  return json(res, 400, { error: 'missing ?to= (number) or ?from= (roman numeral)' });
}
module.exports = { routeRoman, toRoman, fromRoman };
