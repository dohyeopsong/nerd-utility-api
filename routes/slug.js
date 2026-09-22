// /slug — slugify text into URL-safe slugs
const MAP = { 'á':'a','à':'a','â':'a','ä':'a','ã':'a','å':'a','æ':'ae','ç':'c',
  'é':'e','è':'e','ê':'e','ë':'e','í':'i','ì':'i','î':'i','ï':'i','ñ':'n',
  'ó':'o','ò':'o','ô':'o','ö':'o','õ':'o','ø':'o','œ':'oe','ú':'u','ù':'u',
  'û':'u','ü':'u','ý':'y','ÿ':'y','ß':'ss','ð':'d','þ':'th' };

function routeSlug(u, res, json) {
  const q = u.searchParams;
  const text = q.get('text') || q.get('t');
  if (!text) return json(res, 400, { error: 'missing text parameter', example: '/slug?text=Hello%2C%20World!%20This%20is%20a%20Test' });
  if (text.length > 10000) return json(res, 400, { error: 'text too long (max 10000 chars)' });

  const sep = (q.get('sep') || '-').replace(/[^-_]/g, '-');
  const lower = q.get('case') !== 'preserve';
  let maxlen = parseInt(q.get('maxlen') || '0', 10) || 0;

  let s = text;
  // transliterate common accented chars
  s = s.replace(/[áàâäãåæçéèêëíìîïñóòôöõøœúùûüýÿßðþ]/g, c => MAP[c] || c);
  if (lower) s = s.toLowerCase();
  s = s.replace(/[^a-zA-Z0-9]+/g, ' ');       // non-alnum -> space
  s = s.trim().replace(/\s+/g, ' ');            // collapse whitespace
  const slug = s.split(' ').join(sep) || 'n-a';
  const finalSlug = (maxlen > 0 && slug.length > maxlen)
    ? slug.slice(0, maxlen).replace(new RegExp(sep === '-' ? '\\-[^\\-]*$' : '\\_[^\\_]*$'), '')
    : slug;

  return json(res, 200, {
    input: text.slice(0, 100),
    slug: finalSlug,
    length: finalSlug.length,
  });
}
module.exports = { routeSlug };
