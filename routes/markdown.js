// Minimal Markdown -> HTML converter: /markdown?text=... (GET, urlencoded) or POST JSON {text}
// Supports: headers, bold, italic, code spans, fenced code blocks, links, images,
// unordered/ordered lists, blockquotes, hr, paragraphs, inline HTML escaped.
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function inline(s) {
  // code spans first (protect from other formatting)
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
  s = escapeHtml(s);
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1">');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  s = s.replace(/(^|\s)_([^_]+)_/g, '$1<em>$2</em>');
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => '<code>' + escapeHtml(codes[+i]) + '</code>');
  return s;
}
function toHtml(md) {
  const lines = md.replace(/\r\n?/g, '\n').split('\n');
  let html = [], i = 0, listStack = [];
  const closeLists = () => { while (listStack.length) html.push('</' + listStack.pop() + '>'); };
  while (i < lines.length) {
    let line = lines[i];
    if (/^```/.test(line)) {
      const lang = line.slice(3).trim();
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++; // skip closing fence
      html.push('<pre><code' + (lang ? ' class="language-' + escapeHtml(lang) + '"' : '') + '>' + escapeHtml(buf.join('\n')) + '</code></pre>');
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) { closeLists(); html.push('<h' + h[1].length + '>' + inline(h[2]) + '</h' + h[1].length + '>'); i++; continue; }
    if (/^\s*(---+|\*\*\*+)\s*$/.test(line)) { closeLists(); html.push('<hr>'); i++; continue; }
    const ul = line.match(/^\s*[-*+]\s+(.*)$/);
    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ul || ol) {
      const tag = ul ? 'ul' : 'ol';
      if (listStack[listStack.length - 1] !== tag) { closeLists(); html.push('<' + tag + '>'); listStack.push(tag); }
      html.push('<li>' + inline((ul || ol)[1]) + '</li>'); i++; continue;
    }
    if (/^\s*>\s?/.test(line)) {
      closeLists();
      const buf = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
      html.push('<blockquote>' + toHtml(buf.join('\n')) + '</blockquote>');
      continue;
    }
    if (line.trim() === '') { closeLists(); i++; continue; }
    // paragraph: gather until blank/structural
    const buf = [];
    while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,6}\s|```|\s*[-*+]\s|\s*\d+\.\s|\s*>)/.test(lines[i])) { buf.push(lines[i]); i++; }
    if (buf.length) { closeLists(); html.push('<p>' + inline(buf.join('\n')) + '</p>'); }
    else i++;
  }
  closeLists();
  return html.join('\n');
}
async function routeMarkdown(u, res, json, body, method) {
  let text = null;
  if (method === 'POST') {
    try { const b = JSON.parse(body || '{}'); text = b.text ?? b.markdown; } catch { return json(res, 400, { error: 'invalid JSON body' }); }
  } else {
    text = u.searchParams.get('text') ?? u.searchParams.get('md');
  }
  if (!text) return json(res, 400, { error: 'provide ?text=... or POST {text}' });
  return json(res, 200, { html: toHtml(text) });
}
module.exports = { routeMarkdown, toHtml };
