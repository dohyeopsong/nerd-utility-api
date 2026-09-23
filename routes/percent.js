// /percent — URL percent-encoding utilities
function routePercent(u, res, json) {
  const p = u.searchParams;
  const mode = p.get('mode') || (p.get('decode') ? 'decode' : p.get('encode') ? 'encode' : 'encode');
  const text = p.get('text') || p.get('q') || p.get('encode') || p.get('decode') || '';
  if (!text) return json(res, 400, { error: 'provide ?text=<input> with optional ?mode=encode|decode (default encode)' });
  try {
    if (mode === 'decode') {
      const decoded = decodeURIComponent(text);
      return json(res, 200, { mode, input: text, output: decoded, bytes: Buffer.byteLength(decoded, 'utf8') });
    }
    if (mode === 'encode') {
      const component = encodeURIComponent(text);
      const full = encodeURI(text);
      return json(res, 200, { mode, input: text, component, full });
    }
    if (mode === 'isurl') {
      try { new URL(text); return json(res, 200, { mode, input: text, valid: true }); }
      catch { return json(res, 200, { mode, input: text, valid: false }); }
    }
    return json(res, 400, { error: 'unknown mode; use encode|decode|isurl' });
  } catch (e) {
    return json(res, 400, { error: 'decode failed: ' + e.message });
  }
}
module.exports = { routePercent };
