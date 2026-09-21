// HTML entity codec: /html-entities?text=...&mode=encode|decode (default encode), ?all=1 for non-ASCII
const NAMED = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function encode(text, all) {
  let out = text.replace(/[&<>"']/g, c => NAMED[c]);
  if (all) out = out.replace(/[\u0080-\uFFFF]/g, c => '&#' + c.codePointAt(0) + ';');
  return out;
}
const RE_ENTITY = /&(?:#[xX]([0-9a-fA-F]+)|#(\d+)|([a-zA-Z][a-zA-Z0-9]*));/g;
const NAME_TO_CHAR = Object.fromEntries(Object.entries(NAMED).map(([k, v]) => [v.slice(1, -1), k]));
// extended common named entities
Object.assign(NAME_TO_CHAR, { nbsp: '\u00A0', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", copy: '\u00A9', reg: '\u00AE', trade: '\u2122', hellip: '\u2026', mdash: '\u2014', ndash: '\u2013', lsquo: '\u2018', rsquo: '\u2019', ldquo: '\u201C', rdquo: '\u201D', deg: '\u00B0', plusmn: '\u00B1', frac12: '\u00BD', times: '\u00D7', divide: '\u00F7', euro: '\u20AC', pound: '\u00A3', yen: '\u00A5', cent: '\u00A2', sect: '\u00A7', para: '\u00B6', middot: '\u00B7', laquo: '\u00AB', raquo: '\u00BB', bull: '\u2022', dagger: '\u2020', prime: '\u2032', alpha: '\u03B1', beta: '\u03B2', gamma: '\u03B3' });
function decode(text) {
  return text.replace(RE_ENTITY, (m, hex, dec, name) => {
    if (hex) { const cp = parseInt(hex, 16); if (cp > 0x10FFFF) return m; try { return String.fromCodePoint(cp); } catch { return m; } }
    if (dec) { const cp = parseInt(dec, 10); if (cp > 0x10FFFF) return m; try { return String.fromCodePoint(cp); } catch { return m; } }
    if (name) return NAME_TO_CHAR[name] ?? m;
    return m;
  });
}
function routeHtmlEntities(u, res, json) {
  const q = u.searchParams;
  const text = q.get('text') ?? '';
  const mode = q.get('mode') || 'encode';
  if (mode === 'decode') return json(res, 200, { result: decode(text), mode });
  if (mode === 'encode') return json(res, 200, { result: encode(text, q.get('all') === '1'), mode });
  return json(res, 400, { error: 'mode must be encode or decode' });
}
module.exports = { routeHtmlEntities, encode, decode };
