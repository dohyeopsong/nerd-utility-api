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
    const to = q.get('to').toLowerCase().replace(/[^a-z]/g, '');
    const aliases = {
      camel: 'camelCase', camelcase: 'camelCase',
      pascal: 'PascalCase', pascalcase: 'PascalCase',
      snake: 'snake_case', snakecase: 'snake_case',
      screaming: 'SCREAMING_SNAKE_CASE', screamingsnake: 'SCREAMING_SNAKE_CASE', screaming_snake: 'SCREAMING_SNAKE_CASE',
      constant: 'CONSTANT_CASE', constantcase: 'CONSTANT_CASE', upper: 'CONSTANT_CASE',
      kebab: 'kebab-case', kebabcase: 'kebab-case', csskebab: 'css-kebab-case', css: 'css-kebab-case', slug: 'kebab-case',
      title: 'Title Case', titlecase: 'Title Case',
      sentence: 'Sentence case', sentencecase: 'Sentence case',
      dot: 'dot.case', dotcase: 'dot.case',
      path: 'path_case', pathcase: 'path_case'
    };
    const key = aliases[to];
    if (!key) return json(res, 400, { error: `unknown case: ${q.get('to')}. Valid: camel, pascal, snake, screaming, constant, kebab, slug, title, sentence, dot, path, css` });
    return json(res, 200, { original: text, to: q.get('to'), result: r[key] });
  }
  return json(res, 200, r);
}
module.exports = { routeCase };
