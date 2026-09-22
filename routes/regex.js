// /regex — test regex against text: match, capture groups, replace, flags
function routeRegex(u, res, json) {
  const q = Object.fromEntries(u.searchParams.entries());
  const { pattern, text, replacement } = q;
  if (!pattern) throw new Error('provide ?pattern=<regex>');
  if (text === undefined) throw new Error('provide ?text=<string>');
  if (text.length > 500000) throw new Error('text too long (max 500000)');
  const flags = (q.flags || '').replace(/[^gimsuy]/g, '');

  let re;
  try { re = new RegExp(pattern, flags); } catch (e) { return json(res, 400, { valid: false, error: e.message }); }

  const mode = (q.mode || 'test').toLowerCase();

  if (mode === 'test') {
    const m = text.match(re);
    return json(res, 200, { valid: true, matches: !!m, match: m ? m[0] : null, index: m ? m.index : null, groups: m ? m.slice(1) : [] });
  }
  if (mode === 'findall') {
    const g = new RegExp(pattern, flags.replace('g', '') + 'g');
    const all = [...text.matchAll(g)].slice(0, 1000);
    return json(res, 200, { count: all.length, matches: all.map(m => ({ match: m[0], index: m.index, groups: m.slice(1) })) });
  }
  if (mode === 'replace') {
    if (replacement === undefined) throw new Error('replace mode needs ?replacement=');
    let out;
    try { out = text.replace(re, replacement); } catch (e) { return json(res, 400, { error: e.message }); }
    return json(res, 200, { result: out, changed: out !== text });
  }
  if (mode === 'split') {
    return json(res, 200, { parts: text.split(re).slice(0, 1000) });
  }
  throw new Error('mode must be one of: test, findall, replace, split');
}

module.exports = { routeRegex };
