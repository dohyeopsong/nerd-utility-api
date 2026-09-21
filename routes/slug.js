// URL slug generator: transliterate, lowercase, hyphenate, dedupe, trim, strip stopwords option
function slugify(s, opts) {
  const map = { 'á':'a','à':'a','â':'a','ä':'a','ã':'a','å':'a','é':'e','è':'e','ê':'e','ë':'e','í':'i','ì':'i','î':'i','ï':'i','ó':'o','ò':'o','ô':'o','ö':'o','õ':'o','ú':'u','ù':'u','û':'u','ü':'u','ñ':'n','ç':'c','ß':'ss','æ':'ae','ø':'oe','å':'a' };
  let t = String(s).trim().toLowerCase().replace(/[à-ÿæøß]/g, c => map[c] || c);
  if (opts.stopwords) {
    const stop = new Set(String(opts.stopwords).toLowerCase().split(/[,\s]+/).filter(Boolean));
    t = t.split(/\s+/).filter(w => !stop.has(w.replace(/[^a-z0-9-]/g, ''))).join(' ');
  }
  t = t.replace(/[^a-z0-9\s-_]/g, '')      // strip remaining non-slug chars
       .replace(/[\s_]+/g, '-')             // spaces/underscores -> hyphen
       .replace(/-{2,}/g, '-')             // collapse hyphens
       .replace(/^-+|-+$/g, '');            // trim hyphens
  if (opts.maxlen) t = t.split('-').reduce((acc, w) => {
    const cand = acc ? acc + '-' + w : w;
    return cand.length <= opts.maxlen ? cand : acc;
  }, '');
  return t;
}
function routeSlug(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  const text = q.text || q.t || q.s || '';
  if (!text) return json(res, 400, { error: 'provide ?text=<string to slugify>' });
  const opts = { stopwords: q.stopwords, maxlen: q.maxlen ? +q.maxlen : 0 };
  const slug = slugify(text, opts);
  return json(res, 200, { input: text, slug, length: slug.length });
}
module.exports = { routeSlug, slugify };
