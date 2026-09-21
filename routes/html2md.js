// Minimal HTML -> Markdown converter. No deps.
// Strategy: tokenize tags, map block/inline elements to markdown, escape where needed.
function decodeEntities(s) {
  const map = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => { try { return String.fromCodePoint(parseInt(h, 16)); } catch { return ''; } })
    .replace(/&#(\d+);/g, (_, d) => { try { return String.fromCodePoint(parseInt(d, 10)); } catch { return ''; } })
    .replace(/&([a-z0-9#]+);/gi, (m, name) => map[name.toLowerCase()] !== undefined ? map[name.toLowerCase()] : m);
}
function html2md(html) {
  html = String(html).replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/\r\n?/g, '\n');
  const blockTags = new Set(['p','div','section','article','header','footer','main','aside','nav','h1','h2','h3','h4','h5','h6','ul','ol','li','blockquote','pre','table','tr','td','th','hr','br','figure','figcaption']);
  let out = '';
  let i = 0;
  const inlineStack = []; // 'b'|'i'|'code'|'a'|'del'
  const pushInline = (md, close) => { inlineStack.push(close); out += md; };
  function escMd(s) {
    return s.replace(/([\\`*_{}\[\]()#+!~|>-])/g, '\\$1');
  }
  function flushInlines() {
    while (inlineStack.length) out += inlineStack.pop();
  }
  function newline() {
    flushInlines();
    if (out && !out.endsWith('\n\n') && !/\n$/.test(out)) out += '\n';
  }
  function blankline() {
    flushInlines();
    if (out && !out.endsWith('\n\n')) out += '\n\n';
  }
  while (i < html.length) {
    if (html[i] === '<') {
      const close = html[i + 1] === '/';
      const m = /^<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/.exec(html.slice(i));
      if (!m) { out += '<'; i++; continue; }
      const [full, slash, rawTag, attrStr] = m;
      const tag = rawTag.toLowerCase();
      i += full.length;
      if (close) {
        switch (tag) {
          case 'b': case 'strong': if (inlineStack.includes('**')) out += '**'; inlineStack.splice(inlineStack.lastIndexOf('**'), 1); break;
          case 'i': case 'em': if (inlineStack.includes('*')) out += '*'; inlineStack.splice(inlineStack.lastIndexOf('*'), 1); break;
          case 'code': case 'kbd': case 'samp': if (inlineStack.includes('`')) out += '`'; inlineStack.splice(inlineStack.lastIndexOf('`'), 1); break;
          case 'del': case 's': case 'strike': if (inlineStack.includes('~~')) out += '~~'; inlineStack.splice(inlineStack.lastIndexOf('~~'), 1); break;
          case 'a': if (inlineStack.includes(')')) { out += ')'; inlineStack.splice(inlineStack.lastIndexOf(')'), 1); } break;
          case 'p': case 'div': case 'section': case 'article': case 'header': case 'footer': case 'main': case 'aside': case 'nav': case 'figure': case 'figcaption': blankline(); break;
          case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': case 'blockquote': case 'li': case 'pre': case 'td': case 'th': case 'tr': newline(); break;
          case 'ul': case 'ol': case 'table': case 'hr': blankline(); break;
          default: break;
        }
        continue;
      }
      const attrs = {};
      (attrStr.match(/[a-zA-Z-]+(?:\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?/g) || []).forEach(p => {
        const mm = /^([a-zA-Z-]+)(?:\s*=\s*(.*))?$/.exec(p.trim());
        if (mm) attrs[mm[1].toLowerCase()] = mm[2] ? mm[2].replace(/^["']|["']$/g, '') : '';
      });
      switch (tag) {
        case 'br': newline(); break;
        case 'hr': blankline(); out += '---'; blankline(); break;
        case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': blankline(); out += '#'.repeat(+tag[1]) + ' '; break;
        case 'blockquote': blankline(); out += '> '; break;
        case 'b': case 'strong': pushInline('**', '**'); break;
        case 'i': case 'em': pushInline('*', '*'); break;
        case 'code': case 'kbd': case 'samp': pushInline('`', '`'); break;
        case 'del': case 's': case 'strike': pushInline('~~', '~~'); break;
        case 'a': {
          const href = attrs.href || '';
          out += '['; pushInline('', '](' + href + ')');
          break;
        }
        case 'img': {
          const alt = (attrs.alt || '').replace(/[\[\]]/g, '');
          out += '![' + alt + '](' + (attrs.src || '') + ')';
          break;
        }
        case 'li': {
          // detect parent list type is unknown in flat scan; default '-'
          newline(); if (!/\n[-*] $/.test(out)) out += '- ';
          break;
        }
        case 'ol': case 'ul': case 'table': case 'pre': blankline(); break;
        case 'td': case 'th': out += '| '; break;
        case 'tr': newline(); break;
        case 'p': case 'div': case 'section': case 'article': case 'header': case 'footer': case 'main': case 'aside': case 'nav': case 'figure': case 'figcaption': blankline(); break;
        default: break;
      }
      continue;
    }
    // text node until next <
    const next = html.indexOf('<', i);
    const text = html.slice(i, next === -1 ? html.length : next);
    i = next === -1 ? html.length : next;
    const dec = decodeEntities(text);
    const inPre = /<pre\b/i.test(html.slice(Math.max(0, i - 500), i));
    out += inPre ? dec : escMd(dec.replace(/[ \t]+/g, ' ')).replace(/\n\s*\n\s*\n+/g, '\n\n');
  }
  flushInlines();
  return out.replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
function routeHtml2md(u, res, json, body, isPost) {
  let html = u.searchParams.get('html') || u.searchParams.get('url');
  if (isPost && typeof body === 'string') {
    try { const p = JSON.parse(body); html = typeof p === 'string' ? p : (p.html || (p.url ? undefined : undefined)); if (!html && p.url) html = undefined; if (p.url) u = new URL('http://x/?url=' + encodeURIComponent(p.url)); } catch (_) { html = body; }
  } else if (isPost && body && typeof body === 'object') {
    html = body.html;
    if (body.url) u = new URL('http://x/?url=' + encodeURIComponent(body.url));
  }
  const url = u.searchParams.get('url');
  const doRender = (h) => {
    if (!h) return json(res, 400, { error: isPost ? 'POST JSON: {"html": "..."} or {"url": "..."}' : 'param: html=<markup> or url=<page>' });
    if (h.length > 500000) return json(res, 413, { error: 'input too large (max 500KB)' });
    return json(res, 200, { markdown: html2md(h) });
  };
  if (url) {
    fetch(url, { headers: { 'user-agent': 'NerdBot/1.0' }, signal: AbortSignal.timeout(10000) })
      .then(r => r.text())
      .then(doRender)
      .catch(e => json(res, 502, { error: 'fetch failed: ' + e.message }));
    return;
  }
  doRender(html);
}
module.exports = { routeHtml2md, html2md };
