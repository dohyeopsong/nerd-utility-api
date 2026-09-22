// /regex — test, match, and replace with regular expressions
function routeRegex(u, res, json) {
  const q = Object.fromEntries(u.searchParams.entries());
  const pattern = q.pattern || q.re || q.p;
  const text = q.text || q.t || q.s || '';
  if (!pattern) throw new Error('provide ?pattern=<regex>');
  let re;
  try {
    re = new RegExp(pattern, (q.flags || '').replace(/[^gimsuy]/g, ''));
  } catch (e) {
    return json(res, 400, { error: 'invalid regex: ' + e.message });
  }

  const mode = (q.mode || (q.replacement !== undefined ? 'replace' : 'match')).toLowerCase();

  if (mode === 'test') {
    return json(res, 200, { matches: re.test(text), pattern, flags: re.flags });
  }
  if (mode === 'match') {
    const all = [...text.matchAll(re.global ? re : new RegExp(re.source, re.flags + 'g'))];
    return json(res, 200, {
      count: all.length,
      matches: all.slice(0, 500).map(m => ({
        match: m[0],
        index: m.index,
        groups: m.slice(1),
        named: m.groups || undefined
      }))
    });
  }
  if (mode === 'replace') {
    if (q.replacement === undefined) throw new Error('provide ?replacement=<string> for mode=replace');
    let n = -1;
    const out = text.replace(re, q.replacement);
    const cnt = (re.global ? text.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')) || [] : (re.test(text) ? [1] : [])).length;
    return json(res, 200, { result: out, replaced: cnt });
  }
  throw new Error('mode must be test, match, or replace');
}

module.exports = { routeRegex };
