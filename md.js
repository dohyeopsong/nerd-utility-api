// Minimal Markdown -> HTML converter (headings, bold, italic, code, links, lists, blockquotes, hr, paragraphs)
function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function inline(s) {
  s = esc(s);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');
  return s;
}
function convert(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let inCode = false, codeBuf = [], listType = null, paraBuf = [];
  const flushPara = () => { if (paraBuf.length) { out.push('<p>' + inline(paraBuf.join(' ')) + '</p>'); paraBuf = []; } };
  const closeList = () => { if (listType) { out.push(listType === 'ul' ? '</ul>' : '</ol>'); listType = null; } };
  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (inCode) { out.push('<pre><code>' + esc(codeBuf.join('\n')) + '</code></pre>'); codeBuf = []; inCode = false; }
      else { flushPara(); closeList(); inCode = true; }
      continue;
    }
    if (inCode) { codeBuf.push(line); continue; }
    const t = line.trim();
    if (!t) { flushPara(); closeList(); continue; }
    let m;
    if ((m = t.match(/^(#{1,6})\s+(.*)/))) { flushPara(); closeList(); const l = m[1].length; out.push(`<h${l}>` + inline(m[2]) + `</h${l}>`); continue; }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { flushPara(); closeList(); out.push('<hr>'); continue; }
    if ((m = t.match(/^>\s?(.*)/))) { flushPara(); closeList(); out.push('<blockquote>' + inline(m[1]) + '</blockquote>'); continue; }
    if ((m = t.match(/^[-*+]\s+(.*)/))) { flushPara(); if (listType !== 'ul') { closeList(); out.push('<ul>'); listType = 'ul'; } out.push('<li>' + inline(m[1]) + '</li>'); continue; }
    if ((m = t.match(/^\d+\.\s+(.*)/))) { flushPara(); if (listType !== 'ol') { closeList(); out.push('<ol>'); listType = 'ol'; } out.push('<li>' + inline(m[1]) + '</li>'); continue; }
    paraBuf.push(t);
  }
  if (inCode && codeBuf.length) out.push('<pre><code>' + esc(codeBuf.join('\n')) + '</code></pre>');
  flushPara(); closeList();
  return out.join('\n');
}
module.exports = { convert };
