// /slugify — text to URL-safe slug
function routeSlugify(u, res, json) {
  const p = u.searchParams;
  const text = p.get('text') || p.get('q') || p.get('s');
  if (text === null || text === '') return json(res, 200, { usage: '?text=Hello World! — convert text to a URL-safe slug. Options: &separator=-, &lowercase=true, &maxlen' });
  const sep = p.get('separator') || '-';
  const lower = (p.get('lowercase') || 'true') !== 'false';
  const maxlen = +(p.get('maxlen') || 0) || 0;
  let s = text.normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/&/g, ' and ');
  if (lower) s = s.toLowerCase();
  s = s.replace(/[^a-zA-Z0-9]+/g, sep)
    .replace(new RegExp(`^\\${sep}+|\\${sep}+$`, 'g'), '') // trim separators
    .replace(new RegExp(`\\${sep}{2,}`, 'g'), sep); // collapse repeats
  if (maxlen > 0 && s.length > maxlen) {
    s = s.slice(0, maxlen);
    const lastSep = s.lastIndexOf(sep);
    if (lastSep > 0) s = s.slice(0, lastSep); // avoid cutting mid-word
  }
  return json(res, 200, { input: text, slug: s, length: s.length });
}
module.exports = { routeSlugify };
