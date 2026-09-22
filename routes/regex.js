// /regex — test a regex against text: match, capture groups, replace
function routeRegex(u, res, json) {
  const q = u.searchParams;
  const pattern = q.get('pattern') || q.get('re');
  const text = q.get('text') || '';
  const flags = (q.get('flags') || '').replace(/[^gimsuy]/g, '');
  const replace = q.get('replace');

  if (!pattern) return json(res, 400, { error: 'missing pattern parameter', example: '/regex?pattern=%5Cd%2B&text=abc123' });
  if (text.length > 100000) return json(res, 400, { error: 'text too long (max 100000 chars)' });

  let re;
  try { re = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g'); }
  catch (e) { return json(res, 400, { error: `invalid regex: ${e.message}`, pattern }); }

  // guard against catastrophic backtracking: cap execution time via match count
  const matches = [];
  let m, count = 0;
  try {
    while ((m = re.exec(text)) !== null) {
      matches.push({ match: m[0], index: m.index, groups: m.slice(1) });
      if (m[0] === '') re.lastIndex++; // avoid infinite loop on empty matches
      if (++count >= 1000) break;
    }
  } catch (e) { return json(res, 400, { error: `regex execution failed: ${e.message}` }); }

  const result = { pattern, flags, matched: matches.length > 0, match_count: matches.length, matches };
  if (replace !== null) {
    try {
      result.replaced = text.replace(new RegExp(pattern, 'g'), replace);
    } catch (e) { return json(res, 400, { error: `replace failed: ${e.message}` }); }
  }
  return json(res, 200, result);
}
module.exports = { routeRegex };
