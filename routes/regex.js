// /regex — test a pattern against text, with matches, groups, and explanation
function routeRegex(u, res, json) {
  const q = Object.fromEntries(u.searchParams.entries());
  const pattern = q.pattern;
  const text = q.text || '';
  const flags = q.flags || '';
  if (!pattern) throw new Error('provide ?pattern=<regex>');
  if (!/^[gimsuy]*$/.test(flags)) throw new Error('invalid flags (gimsuy only)');

  let re;
  try { re = new RegExp(pattern, flags); } catch (e) { throw new Error('invalid regex: ' + e.message); }

  const globalRun = flags.includes('g') ? new RegExp(pattern, flags) : re;
  const matches = [];
  let m, count = 0;
  if (flags.includes('g')) {
    while ((m = globalRun.exec(text)) !== null) {
      matches.push({ index: m.index, match: m[0], groups: m.slice(1) });
      if (m[0] === '') globalRun.lastIndex++;
      if (++count > 1000) break;
    }
  } else {
    m = globalRun.exec(text);
    if (m) matches.push({ index: m.index, match: m[0], groups: m.slice(1) });
  }

  // substitution
  let replaced = null;
  if (q.replace !== undefined) {
    try { replaced = text.replace(new RegExp(pattern, flags.includes('g') ? flags : flags + 'g'), q.replace); } catch (e) { throw new Error('replace failed: ' + e.message); }
  }

  return json(res, 200, {
    pattern, flags, valid: true,
    matched: matches.length > 0,
    matchCount: matches.length,
    matches,
    namedGroups: m && m.groups ? m.groups : undefined,
    replaced: replaced !== null ? replaced : undefined
  });
}

module.exports = { routeRegex };
