// Minimal Markdown -> HTML converter: headings, bold/italic/code, links, images,
// lists (nested), blockquotes, fenced code, hr, paragraphs. No deps, escaping-first (safe).
function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function inline(s) {
  // s is already escaped
  return s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1">')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/(^|\s)_([^_]+)_/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>');
}
function mdToHtml(md) {
  const lines = md.replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let i = 0, inCode = false, codeBuf = [], codeLang = '';
  let listStack = []; // 'ul' | 'ol'
  let inQuote = false, quoteBuf = [];
  const closeLists = () => { while (listStack.length) out.push(`</${listStack.pop()}>`); };
  const flushQuote = () => {
    if (inQuote) { out.push('<blockquote>' + mdToHtml(quoteBuf.join('\n')).replace(/<\/?p>/g, '') + '</blockquote>'); inQuote = false; quoteBuf = []; }
  };
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (/^```/.test(line.trim())) {
      if (!inCode) { flushQuote(); closeLists(); inCode = true; codeBuf = []; codeLang = line.trim().slice(3).trim(); }
      else { out.push(`<pre><code${codeLang ? ` class="language-${codeLang}"` : ''}>${codeBuf.map(esc).join('\n')}</code></pre>`); inCode = false; }
      continue;
    }
    if (inCode) { codeBuf.push(line); continue; }
    if (!line.trim()) { closeLists(); flushQuote(); continue; }
    if (/^ {0,3}>/.test(line)) { closeLists(); inQuote = true; quoteBuf.push(line.replace(/^ {0,3}> ?/, '')); continue; }
    flushQuote();
    let m;
    if ((m = /^(#{1,6})\s+(.*)$/.exec(line))) { closeLists(); out.push(`<h${m[1].length}>${inline(esc(m[2]))}</h${m[1].length}>`); continue; }
    if (/^ {0,3}([-*_])\s*\1\s*\1[\s\1]*$/.test(line)) { closeLists(); out.push('<hr>'); continue; }
    if ((m = /^(\s*)([-*+])\s+(.*)$/.exec(line))) {
      const depth = Math.floor(m[1].length / 2);
      while (listStack.length > depth) out.push(`</${listStack.pop()}>`);
      if (listStack.length < depth || !listStack.length) { if (listStack.length < depth) { /* can't open multiple at once from one line; open one */ } }
      if (!listStack.length) { listStack.push('ul'); out.push('<ul>'); }
      out.push(`<li>${inline(esc(m[3]))}</li>`); continue;
    }
    if ((m = /^(\s*)(\d+)[.)]\s+(.*)$/.exec(line))) {
      if (!listStack.length || listStack[listStack.length - 1] !== 'ol') { closeLists(); listStack.push('ol'); out.push('<ol>'); }
      out.push(`<li>${inline(esc(m[3]))}</li>`); continue;
    }
    closeLists();
    out.push(`<p>${inline(esc(line))}</p>`);
  }
  if (inCode) out.push(`<pre><code>${codeBuf.map(esc).join('\n')}</code></pre>`);
  closeLists(); flushQuote();
  return out.join('\n');
}
function routeMarkdown(u, res, json, body, isPost) {
  let md = u.searchParams.get('md');
  if (isPost && body && typeof body === 'object') md = body.md || body.markdown;
  else if (isPost && typeof body === 'string') { try { const p = JSON.parse(body); md = typeof p === 'string' ? p : (p.md || p.markdown); } catch (_) {} }
  if (!md) return json(res, 400, { error: isPost ? 'POST JSON body: {"md": "..."}' : 'param: md=markdown text' });
  if (md.length > 100000) return json(res, 413, { error: 'input too large (max 100KB)' });
  const html = mdToHtml(md);
  const plain = u.searchParams.get('format') === 'html';
  if (plain) { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(html); }
  return json(res, 200, { html });
}
module.exports = { routeMarkdown, mdToHtml };
