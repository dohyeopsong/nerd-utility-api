// /slug — URL slug generator (unicode-aware, accent stripping, custom separator)
const DIACRITICS = {
  'à':'a','á':'a','â':'a','ã':'a','ä':'a','å':'a','æ':'ae','ç':'c','è':'e','é':'e','ê':'e','ë':'e',
  'ì':'i','í':'i','î':'i','ï':'i','ñ':'n','ò':'o','ó':'o','ô':'o','õ':'o','ö':'o','ø':'o','œ':'oe',
  'ù':'u','ú':'u','û':'u','ü':'u','ý':'y','ÿ':'y','ß':'ss','đ':'d','ł':'l','þ':'th','ð':'d'
};
function escapeSep(c) { return c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function routeSlug(u, res, json) {
  const q = u.searchParams;
  const text = q.get('text') || q.get('s') || '';
  if (!text) return json(res, 400, { error: 'text required' });
  const sep = (q.get('separator') || '-').slice(0, 1);
  const e = escapeSep(sep);
  let maxLen = parseInt(q.get('maxlength') || '0', 10);
  if (!Number.isFinite(maxLen) || maxLen <= 0) maxLen = Infinity;
  // strip diacritics
  let s = text.toLowerCase().split('').map(c => DIACRITICS[c] || c).join('');
  // remove non-alphanumeric except spaces/hyphens/underscores
  s = s.replace(/[^a-z0-9\s\-_]/g, '');
  // collapse whitespace/hyphens/underscores into single separator (and around existing sep chars)
  s = s.replace(/[\s\-_]+/g, sep).replace(new RegExp(e + '{2,}', 'g'), sep);
  // trim separators
  s = s.replace(new RegExp('^' + e + '+|' + e + '+$', 'g'), '');
  if (!s) return json(res, 400, { error: 'slug is empty after normalization' });
  // truncate at word boundary
  let truncated = false;
  if (s.length > maxLen) {
    truncated = true;
    s = s.slice(0, maxLen);
    const lastSep = s.lastIndexOf(sep);
    if (lastSep > maxLen * 0.5) s = s.slice(0, lastSep);
    s = s.replace(new RegExp(e + '+$', 'g'), '');
  }
  return json(res, 200, { input: text, slug: s, length: s.length, truncated, separator: sep });
}
module.exports = { routeSlug };
