// Slugify + identifier case conversion
function words(text) {
  return String(text || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')       // camelCase -> camel Case
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')   // HTTPServer -> HTTP Server
    .replace(/[_\-\.]+/g, ' ')                    // separators -> space
    .replace(/[^a-zA-Z0-9\s]/g, ' ')              // strip punctuation
    .trim().split(/\s+/).filter(Boolean);
}
function slugify(text) {
  return words(text).join('-').toLowerCase();
}
function toCase(text, style) {
  const w = words(text);
  const lower = w.map(x => x.toLowerCase());
  switch (style) {
    case 'camel': return lower.map((x, i) => i ? x[0].toUpperCase() + x.slice(1) : x).join('');
    case 'pascal': case 'uppercamel': return lower.map(x => x[0].toUpperCase() + x.slice(1)).join('');
    case 'snake': return lower.join('_');
    case 'kebab': case 'slug': return lower.join('-');
    case 'constant': return lower.join('_').toUpperCase();
    case 'title': return w.map(x => x[0].toUpperCase() + x.slice(1).toLowerCase()).join(' ');
    case 'lower': return lower.join(' ');
    case 'upper': return lower.join(' ').toUpperCase();
    default: return null;
  }
}
function routeSlug(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  const text = q.text || q.q;
  if (!text) return json(res, 400, { error: 'missing ?text=' });
  const style = (q.to || 'camel').toLowerCase();
  const result = toCase(text, style);
  if (result === null) return json(res, 400, { error: 'invalid ?to= style. Use camel, pascal, snake, kebab, constant, title, lower, upper' });
  return json(res, 200, {
    input: text, to: style, result,
    slug: slugify(text),
    all: { camel: toCase(text,'camel'), pascal: toCase(text,'pascal'), snake: toCase(text,'snake'), kebab: toCase(text,'kebab'), constant: toCase(text,'constant'), title: toCase(text,'title') }
  });
}
module.exports = { routeSlug, slugify, toCase, words };
