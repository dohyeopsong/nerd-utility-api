// Text case converter: camel, pascal, snake, kebab, constant, title, upper, lower, sentence, alternateng
function words(s) {
  return s.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
          .replace(/[_\-\.]+/g, ' ')
          .split(/\s+/).filter(Boolean);
}
function routeCase(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  const text = q.text || q.t || q.s || '';
  if (!text) return json(res, 400, { error: 'provide ?text=<string>' });
  const to = (q.to || q.case_ || '').toLowerCase() || 'all';
  const w = words(text);
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  const lower = w.map(s => s.toLowerCase());
  const camel = lower.map((s, i) => i ? cap(s) : s).join('');
  const pascal = lower.map(cap).join('');
  const snake = lower.join('_');
  const kebab = lower.join('-');
  const constant = lower.join('_').toUpperCase();
  const title = w.map(cap).join(' ');
  const upper = text.toUpperCase();
  const low = text.toLowerCase();
  const sentence = cap(text.toLowerCase());
  const alternating = [...text].map((c, i) => i % 2 ? c.toUpperCase() : c.toLowerCase()).join('');
  const all = { camelCase: camel, PascalCase: pascal, snake_case: snake, 'kebab-case': kebab,
    CONSTANT_CASE: constant, 'Title Case': title, UPPERCASE: upper, lowercase: low,
    'Sentence case': sentence, aLtErNaTiNg: alternating, wordCount: w.length };
  if (to === 'all') return json(res, 200, { input: text, ...all });
  const key = Object.keys(all).find(k => k.toLowerCase().replace(/[^a-z]/g, '') === to.replace(/[^a-z]/g, ''));
  if (!key) return json(res, 400, { error: `unknown case '${to}'`, available: Object.keys(all).filter(k => k !== 'wordCount') });
  return json(res, 200, { input: text, case: key, result: all[key] });
}
module.exports = { routeCase };
