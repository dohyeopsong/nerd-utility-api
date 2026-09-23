// /slug — convert text to a URL-safe slug (SEO-friendly)
const MAP = { 'à':'a','á':'a','â':'a','ä':'a','ã':'a','å':'a','æ':'ae','ç':'c',
  'è':'e','é':'e','ê':'e','ë':'e','ì':'i','í':'i','î':'i','ï':'i',
  'ò':'o','ó':'o','ô':'o','ö':'o','õ':'o','ø':'o','œ':'oe',
  'ù':'u','ú':'u','û':'u','ü':'u','ñ':'n','ß':'ss','þ':'th','ð':'d',
  'ł':'l','đ':'d','ć':'c','ń':'n','ś':'s','ź':'z','ż':'z' };
function routeSlug(u, res, json) {
  const q = Object.fromEntries(u.searchParams.entries());
  const text = q.text || q.t;
  if (!text) throw new Error('missing ?text=');
  let s = text.toLowerCase().split('').map(c => MAP[c] || c).join('');
  s = s.normalize('NFKD').replace(/[\u0300-\u036f]/g, ''); // strip combining marks
  s = s.replace(/['"’‘“”]/g, '');
  s = s.replace(/&/g, ' and ');
  s = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!s) s = 'n-a';
  const sep = q.sep || '-';
  if (sep !== '-') s = s.split('-').filter(Boolean).join(sep);
  if (q.max) s = s.split('-').slice(0, parseInt(q.max, 10)).join(sep || '-');
  return json(res, 200, {
    input: text,
    slug: s,
    length: s.length,
  });
}
module.exports = { routeSlug };
