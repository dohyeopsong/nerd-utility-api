// /case — convert text between naming conventions
function routeCase(u, res, json) {
  const q = u.searchParams;
  const text = (q.get('text') || '').trim();
  const to = (q.get('to') || 'camel').toLowerCase();
  if (!text) return json(res, 400, { error: 'text required' });

  // First normalize to a word list
  let words;
  if (q.get('from') === 'words' || text.includes(' ')) {
    words = text.split(/[\s_-]+/).filter(Boolean);
  } else {
    // split camelCase, snake_case, kebab-case boundaries
    words = text
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .split(/[\s_-]+/).filter(Boolean);
  }

  const lower = words.map(w => w.toLowerCase());
  const cap = lower.map(w => w.charAt(0).toUpperCase() + w.slice(1));

  let result;
  switch (to) {
    case 'camel':    result = lower.map((w, i) => i ? cap[i] : w).join(''); break;
    case 'pascal':   result = cap.join(''); break;
    case 'snake':    result = lower.join('_'); break;
    case 'kebab':
    case 'dash':     result = lower.join('-'); break;
    case 'constant': result = lower.join('_').toUpperCase(); break;
    case 'title':    result = cap.join(' '); break;
    case 'upper':    result = text.toUpperCase(); break;
    case 'lower':    result = text.toLowerCase(); break;
    default: return json(res, 400, { error: 'unknown to=; use camel, pascal, snake, kebab, constant, title, upper, lower' });
  }
  return json(res, 200, { input: text, to, result, words: lower });
}
module.exports = { routeCase };
