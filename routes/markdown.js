// routes/markdown.js — Markdown -> HTML converter (subset: headings, bold, italic,
// inline code, code fences, links, images, unordered/ordered lists, blockquotes, hr, paragraphs)
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function inline(s) {
  // code spans first (protect from other replacements)
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
  s = escapeHtml(s);
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img alt="$1" src="$2">');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => '<code>' + escapeHtml(codes[+i]) + '</code>');
  return s;
}
function md2html(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  let out = [], i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) { // fenced code block
      const lang = line.slice(3).trim();
      const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++; // skip closing fence
      out.push('<pre><code' + (lang ? ' class="language-' + escapeHtml(lang) + '"' : '') + '>' + escapeHtml(buf.join('\n')) + '</code></pre>');
      continue;
    }
    let m;
    if ((m = line.match(/^(#{1,6})\s+(.*)$/))) { out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); i++; continue; }
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { out.push('<hr>'); i++; continue; }
    if (/^\s*>\s?/.test(line)) { // blockquote
      const buf = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
      out.push('<blockquote>' + inline(buf.join(' ')) + '</blockquote>'); continue;
    }
    if (/^\s*[-*+]\s+/.test(line)) { // ul
      const buf = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) { buf.push(inline(lines[i].replace(/^\s*[-*+]\s+/, ''))); i++; }
      out.push('<ul>' + buf.map(x => '<li>' + x + '</li>').join('') + '</ul>'); continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) { // ol
      const buf = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { buf.push(inline(lines[i].replace(/^\s*\d+\.\s+/, ''))); i++; }
      out.push('<ol>' + buf.map(x => '<li>' + x + '</li>').join('') + '</ol>'); continue;
    }
    if (line.trim() === '') { i++; continue; }
    // paragraph: gather until blank/structural
    const buf = [];
    while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,6}\s|```|\s*>|\s*[-*+]\s|\s*\d+\.\s|\s*[-*_{3,}\s]*$)/.test(lines[i])) {
      buf.push(inline(lines[i])); i++;
    }
    out.push('<p>' + buf.join('\n') + '</p>');
  }
  return out.join('\n');
}
function routeMarkdown(u, res, json) {
  const q = u.searchParams;
  try {
    const md = q.get('md');
    if (!md) return json(res, 400, { error: 'provide md= (URL-encoded markdown)' });
    return json(res, 200, { html: md2html(md) });
  } catch (e) { return json(res, 400, { error: e.message }); }
}
module.exports = { routeMarkdown, md2html };
