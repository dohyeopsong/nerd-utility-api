// /html — HTML escape/unescape, strip tags, extract text
const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const REV = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function escapeHtml(s) { return s.replace(/[&<>"']/g, c => ENTITIES[c]); }
function unescapeHtml(s) {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, e) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      if (!Number.isNaN(code) && code < 0x110000) return String.fromCodePoint(code);
      return m;
    }
    return REV[e.toLowerCase()] !== undefined ? REV[e.toLowerCase()] : m;
  });
}
function stripTags(s) {
  return s.replace(/<script[\s\S]*?<\/script\s*>/gi, '')
          .replace(/<style[\s\S]*?<\/style\s*>/gi, '')
          .replace(/<!--[\s\S]*?-->/g, '')
          .replace(/<[^>]+>/g, '')
          .replace(/\s+/g, ' ')
          .trim();
}

function routeHtml(u, res, json) {
  const q = Object.fromEntries(u.searchParams.entries());
  const text = q.text;
  if (text === undefined) throw new Error('provide ?text=<html string>');
  if (text.length > 50000) throw new Error('text too long (max 50000)');
  const mode = (q.mode || 'escape').toLowerCase();

  if (mode === 'escape') {
    return json(res, 200, { input: text, mode, escaped: escapeHtml(text) });
  }
  if (mode === 'unescape') {
    return json(res, 200, { input: text, mode, unescaped: unescapeHtml(text) });
  }
  if (mode === 'strip') {
    return json(res, 200, {
      input: text, mode,
      text: stripTags(text),
      tagCount: (text.match(/<[^>]+>/g) || []).length,
      scriptsRemoved: /<script/i.test(text)
    });
  }
  throw new Error("mode must be one of: escape, unescape, strip");
}

module.exports = { routeHtml, escapeHtml, unescapeHtml, stripTags };
