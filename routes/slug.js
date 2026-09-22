// /slug — text → URL slug
function routeSlug(u, res, json) {
  const q = u.searchParams;
  const text = q.get('text') || q.get('s');
  if (!text) return json(res, 400, { error: 'provide ?text=', example: '/slug?text=Hello World! 2026' });
  const sep = (q.get('sep') || '-').slice(0, 3);
  const maxlen = Math.min(Math.max(parseInt(q.get('max') || '80', 10), 4), 200);
  const map = { à:'a',á:'a',â:'a',ä:'a',ã:'a',å:'a',è:'e',é:'e',ê:'e',ë:'e',ì:'i',í:'i',î:'i',ï:'i',ò:'o',ó:'o',ô:'o',ö:'o',õ:'o',ù:'u',ú:'u',û:'u',ü:'u',ç:'c',ñ:'n',ß:'ss',æ:'ae',ø:'oe' };
  let s = text.toLowerCase().trim();
  s = s.replace(/[àáâäãåèéêëìíîïòóôöõùúûüçñßæø]/g, c => map[c] || c);
  s = s.replace(/['"]/g, '').replace(/[^a-z0-9]+/g, sep)
       .replace(new RegExp(escaped(sep) + '{2,}', 'g'), sep)
       .replace(new RegExp('^' + escaped(sep) + '|' + escaped(sep) + '$', 'g'), '');
  if (s.length > maxlen) s = s.slice(0, maxlen).replace(new RegExp(escaped(sep) + '[^' + escaped(sep) + ']*$'), '');
  const suggestion = s || 'n-a';
  return json(res, 200, { input: text, slug: suggestion, length: suggestion.length, separator: sep });
}
function escaped(s) { return s.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&'); }
module.exports = { routeSlug };
