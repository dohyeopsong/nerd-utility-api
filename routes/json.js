// /json — validate, format (pretty-print), and minify JSON
function routeJson(u, res, json) {
  const q = u.searchParams;
  const mode = (q.get('mode') || 'validate').toLowerCase();
  const raw = q.get('json');
  if (raw === null) return json(res, 400, { error: 'json required (url-encoded JSON string)' });
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch (e) { return json(res, 200, { valid: false, error: e.message }); }

  if (mode === 'validate') {
    return json(res, 200, {
      valid: true,
      type: Array.isArray(parsed) ? 'array' : parsed === null ? 'null' : typeof parsed,
      keys: parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? Object.keys(parsed).length : (Array.isArray(parsed) ? parsed.length : undefined),
      size_bytes: Buffer.byteLength(raw)
    });
  }
  if (mode === 'format' || mode === 'pretty') {
    const indent = Math.min(Math.max(+(q.get('indent') || 2), 0), 8);
    const out = JSON.stringify(parsed, null, indent);
    return json(res, 200, { valid: true, formatted: out, size_bytes: Buffer.byteLength(out) });
  }
  if (mode === 'minify') {
    const out = JSON.stringify(parsed);
    return json(res, 200, { valid: true, minified: out, size_bytes: Buffer.byteLength(out), original_size: Buffer.byteLength(raw) });
  }
  return json(res, 400, { error: 'mode must be validate|format|minify' });
}
module.exports = { routeJson };
