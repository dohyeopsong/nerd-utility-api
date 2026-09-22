// /case — text case conversions
function splitWords(s) {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')   // camelCase splits
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2') // HTTPServer -> HTTP Server
    .split(/[\s_\-.]+/)
    .filter(Boolean);
}
function routeCase(u, res, json) {
  const q = u.searchParams;
  const text = q.get('text') || q.get('t') || '';
  if (!text) return json(res, 400, { error: 'text required' });
  const words = splitWords(text);
  const lower = words.map(w => w.toLowerCase());
  const cap = words.map(w => w[0].toUpperCase() + w.slice(1).toLowerCase());
  const r = {
    original: text,
    camelCase: lower.length ? lower[0] + cap.slice(1).map(w => w[0].toUpperCase() + w.slice(1)).join('') : '',
    PascalCase: cap.join(''),
    snake_case: lower.join('_'),
    SCREAMING_SNAKE_CASE: lower.join('_').toUpperCase(),
    kebab_case: lower.join('-'),
    'Title Case': cap.join(' '),
    'Sentence case': lower.length ? lower[0][0].toUpperCase() + (lower[0].slice(1) + ' ' + lower.slice(1).join(' ')).trim() : '',
    'dot.case': lower.join('.'),
    CONSTANT_CASE: lower.join('_').toUpperCase(),
    path_case: '/' + lower.join('/'),
    'css-kebab-case': lower.join('-')
  };
  if (q.get('to')) {
    const to = q.get('to');
    const key = Object.keys(r).find(k => k.toLowerCase().replace(/[^a-z]/g, '') === to.toLowerCase().replace(/[^a-z]/g, ''));
    if (!key) return json(res, 400, { error: `unknown case: ${to}. Valid: camel, pascal, snake, screaming, kebab, title, sentence, dot, constant, path` });
    return json(res, 200, { original: text, to, result: r[key] });
  }
  return json(res, 200, r);
}
module.exports = { routeCase };
