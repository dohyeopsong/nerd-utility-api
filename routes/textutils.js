// routes/textutils.js — /slugify and /escape
function routeSlugify(u, res, json) {
  const q = u.searchParams;
  const text = q.get('text');
  if (text === null) return json(res, 400, { error: 'provide text=' });
  const sep = q.get('sep') || '-';
  const lower = q.get('lower') !== 'false';
  let s = text.normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/['"’]/g, '');
  if (lower) s = s.toLowerCase();
  s = s.replace(/[^a-zA-Z0-9]+/g, sep)
       .replace(new RegExp('^\\' + sep + '+|\\' + sep + '+$', 'g'), '');
  return json(res, 200, { input: text, slug: s });
}
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const UNESC = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&#x27;': "'", '&#x2F;': '/' };
function routeEscape(u, res, json) {
  const q = u.searchParams;
  const text = q.get('text');
  if (text === null) return json(res, 400, { error: 'provide text=' });
  const mode = q.get('mode') || 'escape'; // escape | unescape
  let out;
  if (mode === 'unescape')
    out = text.replace(/&(amp|lt|gt|quot|#39|#x27|#x2F);/g, m => UNESC[m]);
  else
    out = text.replace(/[&<>"']/g, c => ESC[c]);
  return json(res, 200, { input: text, mode, output: out });
}
module.exports = { routeSlugify, routeEscape };
