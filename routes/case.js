// Text case converter: slug, camel, snake, kebab, pascal, title, constant, upper, lower
function words(s) {
  return String(s)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-\.]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}
function convertCase(input, to) {
  const w = words(input);
  switch (to) {
    case 'slug': return w.join('-').toLowerCase();
    case 'snake': return w.join('_').toLowerCase();
    case 'kebab': return w.join('-').toLowerCase();
    case 'camel': return w.map((x,i) => i === 0 ? x.toLowerCase() : x[0].toUpperCase() + x.slice(1).toLowerCase()).join('');
    case 'pascal': return w.map(x => x[0].toUpperCase() + x.slice(1).toLowerCase()).join('');
    case 'constant': return w.join('_').toUpperCase();
    case 'title': return w.map(x => x[0].toUpperCase() + x.slice(1).toLowerCase()).join(' ');
    case 'upper': return String(input).toUpperCase();
    case 'lower': return String(input).toLowerCase();
    case 'sentence': return w.join(' ').replace(/^\w/, c => c.toUpperCase());
    default: return null;
  }
}
function routeCase(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  const text = q.text || q.number;
  if (!text) return json(res, 400, { error: 'provide ?text=<string>&to=<slug|snake|camel|pascal|kebab|constant|title|upper|lower|sentence>' });
  const to = (q.to || 'slug').toLowerCase();
  const result = convertCase(text, to);
  if (result === null) return json(res, 400, { error: 'unknown target case: ' + to });
  const all = {};
  for (const c of ['slug','snake','camel','pascal','kebab','constant','title','sentence']) all[c] = convertCase(text, c);
  return json(res, 200, { input: text, to, result, all });
}
module.exports = { routeCase, convertCase };
