// /url — URL encode/decode/parse utilities
function routeUrl(u, res, json) {
  const q = u.searchParams;
  const mode = (q.get('mode') || '').toLowerCase();
  const text = q.get('text') || q.get('url') || '';
  try {
    if (mode === 'encode') {
      return json(res, 200, { input: text, encoded: encodeURIComponent(text), encoded_component: encodeURI(text) });
    }
    if (mode === 'decode') {
      return json(res, 200, { input: text, decoded: decodeURIComponent(text) });
    }
    if (mode === 'parse') {
      const p = new URL(text);
      return json(res, 200, {
        href: p.href, protocol: p.protocol.replace(':', ''), username: p.username || null,
        password: p.password || null, hostname: p.hostname, port: p.port || null,
        pathname: p.pathname, query: Object.fromEntries(p.searchParams), hash: p.hash.replace('#', '') || null,
        origin: p.origin,
      });
    }
    if (!text) throw new Error('provide ?url=https://x.com/path?a=1&mode=parse (or mode=encode|decode with ?text=)');
    // default: parse
    const p = new URL(text);
    return json(res, 200, {
      href: p.href, protocol: p.protocol.replace(':', ''), hostname: p.hostname, port: p.port || null,
      pathname: p.pathname, query: Object.fromEntries(p.searchParams), hash: p.hash.replace('#', '') || null,
      origin: p.origin,
    });
  } catch (e) {
    return json(res, 400, { error: e.message, example: '/url?url=https://user:pw@example.com:8080/p?a=1&mode=parse | /url?text=hello%20world&mode=decode | /url?text=a b&mode=encode' });
  }
}
module.exports = { routeUrl };
