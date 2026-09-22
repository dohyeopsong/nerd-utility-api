// routes/markdown.js — HTML -> Markdown converter (fetches URL or takes html= param)
const http = require('http');
const https = require('https');
function fetchText(url, cb, depth = 0) {
  if (depth > 4) return cb(new Error('too many redirects'));
  const mod = url.startsWith('https') ? https : http;
  mod.get(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; nerd-api)' }, timeout: 8000 }, (r) => {
    if ([301, 302, 303, 307, 308].includes(r.statusCode) && r.headers.location)
      return fetchText(new URL(r.headers.location, url).href, cb, depth + 1);
    let d = '';
    r.on('data', (c) => (d += c));
    r.on('end', () => cb(null, d));
  }).on('error', cb).on('timeout', function () { this.destroy(); cb(new Error('timeout')); });
}
function decodeEntities(s) {
  const m = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (all, e) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return String.fromCodePoint(code);
    }
    return m[e.toLowerCase()] || all;
  });
}
function nodeToMd(node, opts) {
  switch (node.type) {
    case 'text': return decodeEntities(node.raw).replace(/\s+/g, ' ');
    case 'comment': return '';
  }
  const tag = node.tag ? node.tag.toLowerCase() : '';
  const kids = () => (node.children || []).map((c) => nodeToMd(c, opts)).join('');
  switch (tag) {
    case 'script': case 'style': case 'noscript': case 'head': return '';
    case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
      return '\n\n' + '#'.repeat(+tag[1]) + ' ' + kids().trim() + '\n\n';
    case 'p': case 'div': case 'section': case 'article': case 'header': case 'footer':
    case 'main': case 'nav': case 'aside': case 'figure':
      return '\n\n' + kids().trim() + '\n\n';
    case 'br': return '\n';
    case 'hr': return '\n\n---\n\n';
    case 'strong': case 'b': return '**' + kids().trim() + '**';
    case 'em': case 'i': return '*' + kids().trim() + '*';
    case 'del': case 's': return '~~' + kids().trim() + '~~';
    case 'code':
      if (node.parent && node.parent.tag === 'pre') return kids();
      return '`' + kids().trim() + '`';
    case 'pre': return '\n\n```\n' + kids().replace(/\n{3,}/g, '\n\n').trim() + '\n```\n\n';
    case 'a': {
      const href = (node.attrs || {}).href || '';
      const t = kids().trim();
      if (!t || !href || href.startsWith('javascript:')) return t;
      return '[' + t + '](' + href + ')';
    }
    case 'img': {
      const a = node.attrs || {};
      return '![' + decodeEntities(a.alt || '') + '](' + (a.src || '') + ')';
    }
    case 'ul': case 'ol': {
      const items = (node.children || []).filter((c) => c.tag && c.tag.toLowerCase() === 'li')
        .map((li, ix) => (tag === 'ol' ? `${ix + 1}. ` : '- ') + nodeToMd(li, opts).trim().replace(/\n{2,}/g, '\n'));
      return '\n\n' + items.join('\n') + '\n\n';
    }
    case 'blockquote': {
      const inner = kids().trim();
      return '\n\n' + inner.split('\n').map((l) => '> ' + l).join('\n') + '\n\n';
    }
    case 'title': return '';
    default: return kids();
  }
}
// minimal tag soup parser -> tree of {type, tag, attrs, children, raw}
function parseHtml(html) {
  const root = { type: 'root', children: [] };
  const stack = [root];
  let i = 0;
  const push = (n) => { stack[stack.length - 1].children.push(n); };
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt === -1) { push({ type: 'text', raw: html.slice(i) }); break; }
    if (lt > i) push({ type: 'text', raw: html.slice(i, lt) });
    if (html.startsWith('<!--', lt)) { const e = html.indexOf('-->', lt); i = e === -1 ? html.length : e + 3; continue; }
    const gt = html.indexOf('>', lt);
    if (gt === -1) break;
    const inner = html.slice(lt + 1, gt).trim();
    if (inner.startsWith('/')) { // closing tag
      const t = inner.slice(1).toLowerCase().split(/\s/)[0];
      for (let s = stack.length - 1; s > 0; s--) if (stack[s].tag === t) { stack.length = s; break; }
    } else if (inner.endsWith('/')) {
      // self-closing
      const m = inner.slice(0, -1).match(/^([a-zA-Z0-9-]+)(.*)$/);
      if (m) push({ type: 'node', tag: m[1].toLowerCase(), attrs: parseAttrs(m[2]), children: [], parent: stack[stack.length - 1] });
    } else {
      const m = inner.match(/^([a-zA-Z0-9-]+)(.*)$/);
      if (m) {
        const n = { type: 'node', tag: m[1].toLowerCase(), attrs: parseAttrs(m[2]), children: [], parent: stack[stack.length - 1] };
        push(n);
        const void_ = ['br','img','input','meta','link','hr','source','area','base','col','embed','track','wbr'];
        if (!void_.includes(n.tag)) stack.push(n);
      }
    }
    i = gt + 1;
  }
  return root;
}
function parseAttrs(s) {
  const o = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*("[^"]*"|'[^']*'|[^\s"'>]+))?/g;
  let m;
  while ((m = re.exec(s))) o[m[1].toLowerCase()] = (m[2] || '').replace(/^["']|["']$/g, '');
  return o;
}
function htmlToMd(html) {
  return nodeToMd(parseHtml(html), {})
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}
function routeMarkdown(u, res, json) {
  const q = u.searchParams;
  const url = q.get('url'), html = q.get('html');
  if (!url && !html) return json(res, 400, { error: 'provide url= or html=' });
  const convert = (h) => json(res, 200, { markdown: htmlToMd(h) });
  if (html) { try { return convert(html); } catch (e) { return json(res, 400, { error: e.message }); } }
  fetchText(url, (err, h) => {
    if (err) return json(res, 502, { error: err.message });
    try { convert(h); } catch (e) { json(res, 400, { error: e.message }); }
  });
}
module.exports = { routeMarkdown, htmlToMd };
