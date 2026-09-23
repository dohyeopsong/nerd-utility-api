// /piglatin — English to Pig Latin translator
function routePiglatin(u, res, json) {
  const p = u.searchParams;
  const text = p.get('text');
  if (!text) return json(res, 200, { usage: '?text=hello world' });
  const out = text.split(/\s+/).map(w => {
    const m = w.match(/^([^aeiouAEIOU]*)(.+)$/);
    if (!m) return w;
    const [_, prefix, rest] = m;
    const punct = rest.match(/^(.*?)([^\w]*)$/);
    const core = punct[1], tail = punct[2];
    if (!prefix) return w; // starts with vowel
    return core.slice(prefix.length) + prefix + 'ay' + tail;
  }).join(' ');
  // handle vowel-start words: add 'way'
  const out2 = text.split(/\s+/).map(w => {
    const m = w.match(/^([^aeiouAEIOU]*)(.+)$/);
    if (!m) return w;
    const [_, prefix, rest] = m;
    if (prefix === '') return rest + 'way';
    return rest + prefix + 'ay';
  }).join(' ');
  return json(res, 200, { result: out2, input: text });
}
module.exports = { routePiglatin };
