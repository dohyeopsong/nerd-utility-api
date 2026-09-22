// /case — text case conversion utilities
const SMALL = new Set(['a','an','and','as','at','but','by','en','for','if','in','of','on','or','the','to','v','via','vs']);

function words(s) { return s.replace(/[_\-\.]+/g, ' ').split(/(?<=[a-z0-9])(?=[A-Z])|\s+/).filter(Boolean); }

function routeCase(u, res, json) {
  const q = Object.fromEntries(u.searchParams.entries());
  const text = q.text;
  if (!text) throw new Error('provide ?text=<string>');
  if (text.length > 20000) throw new Error('text too long (max 20000)');
  const w = words(text);
  const out = {
    input: text,
    upper: text.toUpperCase(),
    lower: text.toLowerCase(),
    camel: w.map((x,i) => i===0 ? x.toLowerCase() : x[0].toUpperCase()+x.slice(1).toLowerCase()).join(''),
    pascal: w.map(x => x[0].toUpperCase()+x.slice(1).toLowerCase()).join(''),
    snake: text.replace(/[\s\-\.]+/g, '_').replace(/(?<=[a-z0-9])(?=[A-Z])/g, '_').toLowerCase(),
    kebab: text.replace(/[\s_\.]+/g, '-').replace(/(?<=[a-z0-9])(?=[A-Z])/g, '-').toLowerCase(),
    constant: text.replace(/[\s\-\.]+/g, '_').replace(/(?<=[a-z0-9])(?=[A-Z])/g, '_').toUpperCase(),
    title: text.toLowerCase().split(/\s+/).map((x,i) => (i>0 && SMALL.has(x)) ? x : x[0].toUpperCase()+x.slice(1)).join(' '),
    sentence: (t => t[0].toUpperCase()+t.slice(1))(text.toLowerCase()),
    wordCount: text.trim() ? text.trim().split(/\s+/).length : 0
  };
  return json(res, 200, out);
}

module.exports = { routeCase };
