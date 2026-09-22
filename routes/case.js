// /case — text case conversions
function titleCase(s) {
  const small = new Set(['a','an','and','as','at','but','by','for','if','in','of','on','or','the','to','vs','via']);
  return s.toLowerCase().split(/(\s+)/).map((w, i) =>
    (i > 0 && small.has(w)) ? w : w.replace(/\b([a-z])(\w*)/g, (m, a, b) => a.toUpperCase() + b)
  ).join('');
}
function camel(s) { return s.toLowerCase().replace(/[^a-z0-9]+(.)?/g, (_, c) => c ? c.toUpperCase() : ''); }
function snake(s) { return s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/[\s\-]+/g, '_').toLowerCase(); }
function kebab(s) { return snake(s).replace(/_/g, '-'); }

function routeCase(u, res, json) {
  const q = Object.fromEntries(u.searchParams.entries());
  const text = q.text;
  if (text === undefined) throw new Error('provide ?text=<string>');
  if (text.length > 10000) throw new Error('text too long (max 10000)');

  return json(res, 200, {
    input: text,
    upper: text.toUpperCase(),
    lower: text.toLowerCase(),
    title: titleCase(text),
    sentence: text.charAt(0).toUpperCase() + text.slice(1).toLowerCase(),
    camel: camel(text),
    pascal: camel(text).replace(/^./, c => c.toUpperCase()),
    snake: snake(text),
    kebab: kebab(text),
    constant: snake(text).toUpperCase(),
    swap: text.split('').map(c => c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase()).join(''),
    reverse: text.split('').reverse().join(''),
    words: text.trim().split(/\s+/).filter(Boolean).length,
    chars: text.length
  });
}

module.exports = { routeCase };
