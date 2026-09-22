// Markdown -> HTML: /md2html?md=<text> (GET) or POST {"md": "..."}
// Supports: headings, bold/italic/strikethrough, inline code, code fences,
// links, images, blockquotes, ul/ol lists, hr, paragraphs, autolinks.
function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function inline(s) {
  s = esc(s);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1">');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
  s = s.replace(/(^|[\s(])((?:https?:\/\/)[^\s<)]+)/g, '$1<a href="$2">$2</a>');
  s = s.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  s = s.replace(/_([^_]+)_/g, '<em>$1</em>');
  s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  return s;
}
function md2html(md) {
  const lines = md.split('\n');
  const out = [];
  let i = 0, inCode = false, listType = null, inQuote = false, para = [];
  const flushPara = () => { if (para.length) { out.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; } };
  const closeList = () => { if (listType) { out.push(listType === 'ul' ? '</ul>' : '</ol>'); listType = null; } };
  const closeQuote = () => { if (inQuote) { out.push('</blockquote>'); inQuote = false; } };
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      flushPara(); closeList(); closeQuote();
      if (!inCode) { inCode = true; const lang = line.slice(3).trim(); out.push('<pre><code' + (lang ? ' class="language-' + esc(lang) + '"' : '') + '>'); }
      else { inCode = false; out.push('</code></pre>'); }
      i++; continue;
    }
    if (inCode) { out.push(esc(line)); i++; continue; }
    if (!line.trim()) { flushPara(); closeList(); closeQuote(); i++; continue; }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) { flushPara(); closeList(); closeQuote(); out.push(`<h${h[1].length}>` + inline(h[2]) + `</h${h[1].length}>`); i++; continue; }
    if (/^\s*([-*_])\s*\1\s*\1[\s\1]*$/.test(line)) { flushPara(); closeList(); closeQuote(); out.push('<hr>'); i++; continue; }
    const q = line.match(/^>\s?(.*)$/);
    if (q) { flushPara(); closeList(); if (!inQuote) { out.push('<blockquote>'); inQuote = true; } out.push('<p>' + inline(q[1]) + '</p>'); i++; continue; }
    const ul = line.match(/^\s*[-*+]\s+(.*)$/);
    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ul || ol) { flushPara(); closeQuote(); const t = ul ? 'ul' : 'ol'; if (listType !== t) { closeList(); out.push('<' + t + '>'); listType = t; } out.push('<li>' + inline((ul || ol)[1]) + '</li>'); i++; continue; }
    para.push(line.trim()); i++;
  }
  if (inCode) out.push('</code></pre>');
  flushPara(); closeList(); closeQuote();
  return out.join('\n');
}
async function routeMd2Html(u, res, json, body, method) {
  let md = u.searchParams.get('md');
  if (method === 'POST') { try { const b = JSON.parse(body || '{}'); if (typeof b.md === 'string') md = b.md; } catch {} }
  if (md == null) return json(res, 400, { error: 'provide ?md=<markdown> or POST {"md": "..."}' });
  return json(res, 200, { html: md2html(md) });
}
module.exports = { routeMd2Html, md2html };
