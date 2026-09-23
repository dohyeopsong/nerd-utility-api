// /roman — convert between integers (1-3999) and roman numerals
const MAP = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
const ROMAN_RE = /^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;

function toRoman(n) {
  let out = '';
  for (const [v, s] of MAP) while (n >= v) { out += s; n -= v; }
  return out;
}
function fromRoman(r) {
  const vals = { I:1,V:5,X:10,L:50,C:100,D:500,M:1000 };
  let total = 0;
  for (let i = 0; i < r.length; i++) {
    const c = vals[r[i]], n = vals[r[i+1]];
    total += c < n ? -c : c;
  }
  return total;
}

function routeRoman(u, res, json, body, isPost) {
  const q = u.searchParams.get('q') || u.searchParams.get('value');
  if (!isPost && !q) {
    return json(res, 200, {
      op: 'roman',
      description: 'Convert integers (1-3999) to roman numerals and back.',
      usage: '/roman?q=2024 or /roman?q=MMXXIV',
    });
  }
  if (!q) return json(res, 400, { error: 'Provide ?q=' });
  const s = String(q).trim().toUpperCase();
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10);
    if (n < 1 || n > 3999) return json(res, 400, { error: 'Integer must be 1-3999' });
    return json(res, 200, { input: n, roman: toRoman(n) });
  }
  if (ROMAN_RE.test(s)) {
    return json(res, 200, { input: s, number: fromRoman(s) });
  }
  return json(res, 400, { error: 'Not a valid integer (1-3999) or roman numeral' });
}

module.exports = { routeRoman };
