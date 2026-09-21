// Minimal markdown -> HTML converter (headings, bold, italic, code, links, lists, paragraphs)
function escapeHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function inline(s) {
  s = escapeHtml(s);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return s;
}
function mdToHtml(md) {
  const lines = String(md).replace(/\r/g,'').split('\n');
  const out = [];
  let inCode = false, listType = null;
  for (let line of lines) {
    if (line.trim().startsWith('```')) {
      if (inCode) { out.push('</code></pre>'); inCode = false; }
      else { out.push('<pre><code>'); inCode = true; }
      continue;
    }
    if (inCode) { out.push(escapeHtml(line)); continue; }
    if (/^\s*$/.test(line)) { if (listType) { out.push(`</${listType}>`); listType = null; } continue; }
    let m;
    if ((m = line.match(/^(#{1,6})\s+(.*)/))) { out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); continue; }
    if ((m = line.match(/^\s*[-*]\s+(.*)/))) { if (listType !== 'ul') { if (listType) out.push(`</${listType}>`); out.push('<ul>'); listType = 'ul'; } out.push(`<li>${inline(m[1])}</li>`); continue; }
    if ((m = line.match(/^\s*\d+\.\s+(.*)/))) { if (listType !== 'ol') { if (listType) out.push(`</${listType}>`); out.push('<ol>'); listType = 'ol'; } out.push(`<li>${inline(m[1])}</li>`); continue; }
    if ((m = line.match(/^>\s?(.*)/))) { out.push(`<blockquote>${inline(m[1])}</blockquote>`); continue; }
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) { out.push('<hr>'); continue; }
    out.push(`<p>${inline(line)}</p>`);
  }
  if (listType) out.push(`</${listType}>`);
  if (inCode) out.push('</code></pre>');
  return out.join('\n');
}
function routeMarkdown(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  const md = q.md || q.text || q.number;
  if (!md) return json(res, 400, { error: 'provide ?md=<markdown>' });
  const html = mdToHtml(md);
  const want = q.format === 'html' ? 'html' : 'json';
  if (want === 'html') { res.writeHead(200, {'Content-Type':'text/html'}); return res.end(html); }
  return json(res, 200, { input: md, html });
}
module.exports = { routeMarkdown, mdToHtml };
