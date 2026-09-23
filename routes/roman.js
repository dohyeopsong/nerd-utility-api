// /roman — convert between integers and Roman numerals
const VALS = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
  [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
  [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];
const ROMAN_RE = /^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;

function toRoman(n) {
  let out = '';
  for (const [v, s] of VALS) while (n >= v) { out += s; n -= v; }
  return out;
}

function fromRoman(s) {
  const map = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const c = map[s[i]], n = map[s[i + 1]];
    total += (n && n > c) ? -c : c;
  }
  return total;
}

function routeRoman(u, res, json) {
  const p = u.searchParams;
  const num = (p.get('n') || p.get('number') || '').trim();
  const rom = (p.get('roman') || p.get('r') || '').trim().toUpperCase();
  if (!num && !rom) return json(res, 200, { usage: '?n=2026 (int→roman) or ?roman=MMXXVI (roman→int). Range 1-3999.' });
  if (num) {
    const n = parseInt(num, 10);
    if (!Number.isInteger(n) || n < 1 || n > 3999) return json(res, 400, { error: 'n must be an integer 1-3999' });
    const roman = toRoman(n);
    return json(res, 200, { input: n, roman, valid: fromRoman(roman) === n });
  }
  if (!ROMAN_RE.test(rom) || !rom) return json(res, 400, { error: 'invalid Roman numeral', hint: 'I V X L C D M, max 3999' });
  const n = fromRoman(rom);
  return json(res, 200, { input: rom, number: n, canonical: toRoman(n) === rom, canonical_form: toRoman(n) });
}

module.exports = { routeRoman };
