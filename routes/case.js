// /case — text case conversion utilities
function routeCase(u, res, json) {
  const q = u.searchParams;
  const text = q.get('text') || '';
  const to = (q.get('to') || '').toLowerCase();
  if (!text) return json(res, 400, { error: 'text required' });
  if (!to) return json(res, 400, { error: 'to required: camel|pascal|snake|kebab|constant|title|sentence|upper|lower|slug' });

  const words = text.replace(/[_\-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
  let result;
  switch (to) {
    case 'camel':    result = words.map((w, i) => i ? cap(w) : w).join(''); break;
    case 'pascal':   result = words.map(cap).join(''); break;
    case 'snake':    result = words.join('_'); break;
    case 'kebab':    result = words.join('-'); break;
    case 'slug':     result = text.toLowerCase().normalize('NFKD')
                                  .replace(/[\u0300-\u036f]/g, '')
                                  .replace(/[^a-z0-9]+/g, '-')
                                  .replace(/^-+|-+$/g, ''); break;
    case 'constant': result = words.join('_').toUpperCase(); break;
    case 'title':    result = words.map(cap).join(' '); break;
    case 'sentence': result = cap(words.join(' ')); break;
    case 'upper':    result = text.toUpperCase(); break;
    case 'lower':    result = text.toLowerCase(); break;
    default: return json(res, 400, { error: 'unknown case: ' + to });
  }
  return json(res, 200, { input: text, to, result, word_count: words.length });
}
module.exports = { routeCase };
