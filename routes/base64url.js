// /base64url — URL-safe base64 encode/decode
function routeBase64Url(u, res, json) {
  const q = u.searchParams;
  const text = q.get('text') || '';
  const mode = (q.get('mode') || 'encode').toLowerCase();
  if (!text) return json(res, 400, { error: 'text required' });
  try {
    if (mode === 'encode') {
      let b = Buffer.from(text, 'utf8').toString('base64')
        .replace(/\+/g, '-').replace(/\//g, '_');
      if (q.get('pad') === '0') b = b.replace(/=+$/, '');
      return json(res, 200, { input: text, mode, result: b });
    }
    if (mode === 'decode') {
      let s = text.replace(/-/g, '+').replace(/_/g, '/');
      while (s.length % 4) s += '=';
      return json(res, 200, { input: text, mode, result: Buffer.from(s, 'base64').toString('utf8') });
    }
    return json(res, 400, { error: 'mode must be encode or decode' });
  } catch (e) {
    return json(res, 400, { error: 'decode failed: invalid base64url input' });
  }
}
module.exports = { routeBase64Url };
