// /regex — test a pattern against text: match, replace, capture groups
function routeRegex(u, res, json) {
  const q = u.searchParams;
  const pattern = q.get('pattern') || q.get('regex') || '';
  const text = q.get('text') || q.get('input') || '';
  const flags = q.get('flags') || '';
  const replace = q.get('replace'); // if set → do replacement
  const op = (q.get('op') || 'match').toLowerCase();
  if (!pattern) return json(res, 400, { error: 'provide pattern= and text= (optional flags=, replace=, op=match|test|replace)' });
  if (!/^[\w-]*$/.test(flags)) return json(res, 400, { error: 'invalid flags (allowed: g i m s u y)' });
  let re;
  try { re = new RegExp(pattern, flags); }
  catch (e) { return json(res, 400, { error: 'invalid regex: ' + e.message }); }

  try {
    if (op === 'test' || replace === null && op === 'test') {
      return json(res, 200, { pattern, flags, matches: re.test(text) });
    }
    if (op === 'replace') {
      if (replace === null) return json(res, 400, { error: 'provide replace= for replace op' });
      const global = re.flags.includes('g') ? re : new RegExp(pattern, re.flags + 'g');
      return json(res, 200, { pattern, flags: global.flags, result: text.replace(global, replace) });
    }
    // default: match — return all matches with groups
    const out = [];
    if (re.global) {
      let m;
      while ((m = re.exec(text)) !== null) {
        out.push({ match: m[0], index: m.index, groups: m.length > 1 ? m.slice(1) : undefined });
        if (m[0] === '') re.lastIndex++;
        if (out.length > 1000) break;
      }
    } else {
      const m = text.match(re);
      if (m) out.push({ match: m[0], index: m.index, groups: m.length > 1 ? m.slice(1) : undefined });
    }
    return json(res, 200, { pattern, flags, count: out.length, matches: out });
  } catch (e) { return json(res, 400, { error: e.message }); }
}
module.exports = { routeRegex };
