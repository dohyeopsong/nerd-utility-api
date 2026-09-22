// /json — validate, pretty-print, minify, sort keys, extract paths
function routeJson(u, res, json) {
  const q = Object.fromEntries(u.searchParams.entries());
  const { data, mode, indent } = q;
  if (data === undefined) throw new Error('provide ?data=<json string>');
  if (data.length > 500000) throw new Error('data too long (max 500000)');
  const m = (mode || 'validate').toLowerCase();
  let parsed;
  try { parsed = JSON.parse(data); } catch (e) { return json(res, 400, { valid: false, error: e.message }); }

  if (m === 'validate') {
    return json(res, 200, { valid: true, type: Array.isArray(parsed) ? 'array' : typeof parsed, size: data.length });
  }
  if (m === 'pretty') {
    return json(res, 200, { pretty: JSON.stringify(parsed, null, Number(indent) > 0 && Number(indent) <= 8 ? Number(indent) : 2) });
  }
  if (m === 'minify') {
    return json(res, 200, { minified: JSON.stringify(parsed), size: JSON.stringify(parsed).length, saved: data.length - JSON.stringify(parsed).length });
  }
  if (m === 'sort') {
    const srt = (o) => {
      if (Array.isArray(o)) return o.map(srt);
      if (o && typeof o === 'object') return Object.keys(o).sort().reduce((a, k) => (a[k] = srt(o[k]), a), {});
      return o;
    };
    return json(res, 200, { sorted: srt(parsed) });
  }
  if (m === 'stats') {
    const stats = { type: typeof parsed, keys: 0, depth: 0, nodes: 0, arrays: 0, strings: 0, numbers: 0, booleans: 0, nulls: 0 };
    const walk = (o, d) => {
      stats.nodes++; stats.depth = Math.max(stats.depth, d);
      if (Array.isArray(o)) { stats.arrays++; o.forEach(x => walk(x, d + 1)); }
      else if (o && typeof o === 'object') { stats.keys += Object.keys(o).length; Object.values(o).forEach(x => walk(x, d + 1)); }
      else if (typeof o === 'string') stats.strings++;
      else if (typeof o === 'number') stats.numbers++;
      else if (typeof o === 'boolean') stats.booleans++;
      else if (o === null) stats.nulls++;
    };
    walk(parsed, 1);
    return json(res, 200, stats);
  }
  throw new Error('mode must be one of: validate, pretty, minify, sort, stats');
}

module.exports = { routeJson };
