// Regex tester: test/match/replace against a pattern with flags
function routeRegex(u, res, json) {
  const pattern = u.searchParams.get('pattern');
  const flags = u.searchParams.get('flags') || '';
  const text = u.searchParams.get('text') || '';
  const replace = u.searchParams.get('replace');
  if (pattern === null || pattern === undefined || pattern === '') return json(res, 400, { error: 'params: pattern, text, [flags], [replace]' });
  if (!/^^[gimsuyd]*$/.test(flags)) return json(res, 400, { error: 'invalid flags' });
  let re;
  try { re = new RegExp(pattern, flags); } catch (e) { return json(res, 400, { error: 'invalid regex: ' + e.message }); }
  const mode = u.searchParams.get('mode') || (replace !== null ? 'replace' : 'match');
  if (mode === 'test') {
    return json(res, 200, { pattern, flags, matches: re.test(text) });
  }
  if (mode === 'replace') {
    if (replace === null) return json(res, 400, { error: 'replace param required for replace mode' });
    let out, count = 0;
    try {
      if (re.global) {
        const matches = text.match(re) || [];
        count = matches.length;
      }
      out = text.replace(re, replace);
    } catch (e) { return json(res, 400, { error: 'replace failed: ' + e.message }); }
    return json(res, 200, { pattern, flags, count, result: out });
  }
  // match mode: return all matches with groups
  const results = [];
  if (re.global) {
    let m;
    const rx = new RegExp(pattern, flags);
    let guard = 0;
    while ((m = rx.exec(text)) !== null && guard++ < 1000) {
      results.push({ match: m[0], index: m.index, groups: m.slice(1) });
      if (m[0] === '') rx.lastIndex++;
    }
  } else {
    const m = text.match(re);
    if (m) results.push({ match: m[0], index: m.index, groups: m.slice(1) });
  }
  return json(res, 200, { pattern, flags, matchCount: results.length, matches: results });
}
module.exports = { routeRegex };
