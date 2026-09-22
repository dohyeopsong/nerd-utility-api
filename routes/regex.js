// /regex — test, match, and replace with regular expressions
function routeRegex(u, res, json) {
  const q = Object.fromEntries(u.searchParams.entries());
  const { pattern, flags, text, replacement, mode } = q;
  if (!pattern) throw new Error('provide ?pattern=<regex>');
  if (text === undefined) throw new Error('provide ?text=<string>');
  if (text.length > 50000) throw new Error('text too long (max 50000)');
  const f = (flags || '').replace(/[^gimsuy]/g, '');
  if (flags && f !== flags) throw new Error('invalid flags, allowed: g i m s u y');

  let re;
  try { re = new RegExp(pattern, f); } catch (e) { throw new Error('bad pattern: ' + e.message); }

  const m = (mode || 'test').toLowerCase();
  if (m === 'test') {
    const r = re.test(text);
    return json(res, 200, { input: text, pattern: '/' + pattern + '/' + f, mode: m, matches: r });
  }
  if (m === 'match') {
    const all = [...text.matchAll(re)];
    return json(res, 200, {
      input: text, pattern: '/' + pattern + '/' + f, mode: m,
      count: all.length,
      matches: all.map(x => ({ match: x[0], index: x.index, groups: x.slice(1), named: x.groups || null }))
    });
  }
  if (m === 'replace') {
    if (replacement === undefined) throw new Error('mode=replace requires ?replacement=');
    return json(res, 200, {
      input: text, pattern: '/' + pattern + '/' + f, mode: m,
      result: text.replace(re, replacement),
      replaced: (text.match(re) || []).length
    });
  }
  if (m === 'split') {
    return json(res, 200, {
      input: text, pattern: '/' + pattern + '/' + f, mode: m,
      parts: text.split(re).slice(0, 100)
    });
  }
  throw new Error('mode must be one of: test, match, replace, split');
}

module.exports = { routeRegex };
