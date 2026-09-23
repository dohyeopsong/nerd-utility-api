// /slug — convert text into a clean URL slug
function routeSlug(u, res, json) {
  const p = u.searchParams;
  let t = p.get('text') || p.get('t') || '';
  if (!t) return json(res, 200, { usage: '?text=Hello, World! — slugify text. Options: &sep=- (separator), &lower=0/1, &maxlen=N' });
  const sep = (p.get('sep') || '-').slice(0, 3);
  const lower = (p.get('lower') || '1') !== '0';
  const maxlen = parseInt(p.get('maxlen') || '0', 10) || Infinity;

  let s = t
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^\w\s-]/g, ' ')        // drop punctuation
    .trim()
    .replace(/[\s_-]+/g, sep);         // collapse whitespace/underscores/hyphens

  if (lower) s = s.toLowerCase();
  const truncated = s.length > maxlen;
  if (truncated) s = s.slice(0, maxlen).replace(new RegExp(sep + '+$'), '');

  return json(res, 200, { input: t, slug: s, truncated, length: s.length });
}

module.exports = { routeSlug };
