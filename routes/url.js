// /url — encode, decode, and parse URLs
function routeUrl(u, res, json) {
  const q = u.searchParams;
  const mode = (q.get('mode') || 'encode').toLowerCase();
  const s = q.get('url') !== null ? q.get('url') : q.get('text');
  if (mode === 'encode') {
    if (s === null) return json(res, 400, { error: 'url or text required' });
    return json(res, 200, { encoded: encodeURIComponent(s) });
  }
  if (mode === 'decode') {
    if (s === null) return json(res, 400, { error: 'url or text required' });
    try { return json(res, 200, { decoded: decodeURIComponent(s) }); }
    catch (e) { return json(res, 400, { error: 'malformed percent-encoding: ' + e.message }); }
  }
  if (mode === 'parse') {
    if (!s) return json(res, 400, { error: 'url required' });
    let p;
    try { p = new URL(s); } catch (e) { return json(res, 400, { error: 'invalid URL: ' + e.message }); }
    const params = {};
    p.searchParams.forEach((v, k) => { params[k] = v; });
    return json(res, 200, {
      href: p.href, protocol: p.protocol.replace(':', ''), host: p.host,
      hostname: p.hostname, port: p.port || null, pathname: p.pathname,
      hash: p.hash || null, origin: p.origin, params
    });
  }
  return json(res, 400, { error: 'mode must be encode|decode|parse' });
}
module.exports = { routeUrl };
