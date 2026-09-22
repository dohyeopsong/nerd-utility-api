// /slug — URL slug generation from arbitrary text
function routeSlug(u, res, json) {
  const q = u.searchParams;
  const text = q.get('text') || '';
  const sep = (q.get('sep') || '-').slice(0, 3) || '-';
  const lower = q.get('case') !== 'preserve';

  if (!text) {
    return json(res, 400, {
      error: 'provide ?text=Hello World!',
      note: 'Generates a URL-safe slug. Options: ?sep=_ (separator), ?case=preserve'
    });
  }

  let s = text;
  if (lower) s = s.toLowerCase();

  // transliterate common accented chars
  s = s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');

  // replace anything not alphanumeric with separator
  s = s.replace(/[^a-z0-9]+/gi, sep)
       // strip leading/trailing separators
       .replace(new RegExp('^\\' + sep + '+|\\' + sep + '+$', 'g'), '');

  // collapse repeated separators
  while (s.includes(sep + sep)) s = s.split(sep + sep).join(sep);

  return json(res, 200, {
    input: text,
    slug: s,
    length: s.length,
    separator: sep
  });
}

module.exports = { routeSlug };
