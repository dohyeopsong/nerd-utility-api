// /html — HTML entity escaping/unescaping + tag stripping
const ENTITIES = { '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot', "'": '#39' };
const REV = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', copy: '©', reg: '®', hellip: '…', mdash: '—', ndash: '–', laquo: '«', raquo: '»', deg: '°', plusmn: '±', times: '×', divide: '÷', euro: '€', pound: '£', yen: '¥', cent: '¢' };
const REV_NUM = { 39: "'", 34: '"', 169: '©', 174: '®', 8230: '…', 8212: '—', 8211: '–', 171: '«', 187: '»', 176: '°', 177: '±', 215: '×', 247: '÷', 160: ' ' };

function routeHtml(u, res, json) {
  const q = Object.fromEntries(u.searchParams.entries());
  const text = q.text || q.data;
  if (text === undefined) throw new Error('provide ?text=<string>');
  if (text.length > 100000) throw new Error('text too long (max 100000)');
  const mode = (q.mode || 'escape').toLowerCase();

  if (mode === 'escape') {
    return json(res, 200, { escaped: text.replace(/[&<>"']/g, c => `&${ENTITIES[c]};`) });
  }
  if (mode === 'unescape') {
    return json(res, 200, { unescaped: text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, body) => {
      if (body[0] === '#') {
        const isHex = body[1] === 'x' || body[1] === 'X';
        const code = parseInt(body.slice(isHex ? 2 : 1), isHex ? 16 : 10);
        if (!REV_NUM[code] && (code < 32 || code > 0x10FFFF || Number.isNaN(code))) return m;
        return String.fromCodePoint(code);
      }
      return REV[body.toLowerCase()] !== undefined ? REV[body.toLowerCase()] : m;
    }) });
  }
  if (mode === 'strip') {
    // remove tags, collapse whitespace
    const stripped = text.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    return json(res, 200, { stripped, length: stripped.length });
  }
  throw new Error('mode must be one of: escape, unescape, strip');
}

module.exports = { routeHtml };
