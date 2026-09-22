// /case — case conversion (camel, snake, kebab, pascal, title, upper, lower, constant)
function routeCase(u, res, json) {
  const q = u.searchParams;
  const text = q.get('text') || q.get('s') || '';
  const mode = (q.get('to') || q.get('mode') || 'camel').toLowerCase();
  if (!text) return json(res, 400, { error: 'text required' });
  // split into words: on spaces, underscores, hyphens, camelCase boundaries
  const words = text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(w => w.toLowerCase());
  if (!words.length) return json(res, 400, { error: 'no words found in text' });
  const cap = w => w[0].toUpperCase() + w.slice(1);
  let result, valid = true;
  switch (mode) {
    case 'camel': result = words.map((w, i) => i ? cap(w) : w).join(''); break;
    case 'pascal': result = words.map(cap).join(''); break;
    case 'snake': result = words.join('_'); break;
    case 'kebab': result = words.join('-'); break;
    case 'constant': result = words.join('_').toUpperCase(); break;
    case 'title': result = words.map(cap).join(' '); break;
    case 'upper': result = text.toUpperCase(); break;
    case 'lower': result = text.toLowerCase(); break;
    default: valid = false; result = 'unknown mode: ' + mode + ' (use camel, pascal, snake, kebab, constant, title, upper, lower)';
  }
  return json(res, valid ? 200 : 400, { input: text, mode, result });
}
module.exports = { routeCase };
