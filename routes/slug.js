// /slug — convert text into a clean URL slug
function routeSlug(u, res, json) {
  const p = u.searchParams;
  const t = p.get('text') || p.get('t') || '';
  if (!t) return json(res, 200, { usage: '?text=Hello, World! — slugify text. Options: &sep=- (separator), &lower=0/1, &maxlen=N' });
  const sep = (p.get('sep') || '-').slice(0, 3);
  const lower = (p.get('lower') !== '0');
  const maxRaw = parseInt(p.get('maxlen') || '', 10);
  const maxlen = Number.isInteger(maxRaw) && maxRaw > 0 ? maxRaw : null;

  let s = t
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, ' ')
    .trim()
    .replace(/[\s_-]+/g, sep);

  if (lower) s = s.toLowerCase();
  const truncated = maxlen !== null && s.length > maxlen;
  if (truncated) {
    s = s.slice(0, maxlen);
    // trim trailing separator fragments
    s = s.replace(new RegExp('[\\' + sep + ']+$'), '');
  }

  return json(res, 200, { input: t, slug: s, truncated, length: s.length });
}

module.exports = { routeSlug };
