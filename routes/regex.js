// Regex tester: /regex?pattern=...&flags=...&text=...&mode=match|test|replace&replacement=...
function routeRegex(u, res, json) {
  const q = u.searchParams;
  const pattern = q.get('pattern'), text = q.get('text') ?? '';
  if (!pattern) return json(res, 400, { error: 'pattern required' });
  let flags = q.get('flags') || '', mode = q.get('mode') || 'match';
  if (mode === 'matchall' && !flags.includes('g')) flags += 'g';
  let re;
  try { re = new RegExp(pattern, flags); } catch (e) { return json(res, 400, { error: 'invalid regex: ' + e.message }); }
  try {
    if (mode === 'test') {
      return json(res, 200, { matches: re.test(text), mode });
    }
    if (mode === 'replace') {
      const replacement = q.get('replacement') ?? '';
      const count = (text.match(new RegExp(pattern, flags.includes('g') ? flags : flags + 'g')) || []).length;
      return json(res, 200, { result: text.replace(re, replacement), replacements: count, mode });
    }
    if (mode === 'matchall') {
      const out = []; let m;
      if (flags.includes('g')) {
        while ((m = re.exec(text)) !== null) { out.push({ match: m[0], index: m.index, groups: m.slice(1) }); if (m[0] === '') re.lastIndex++; if (out.length > 1000) break; }
      } else {
        while ((m = re.exec(text)) !== null) { out.push({ match: m[0], index: m.index, groups: m.slice(1) }); re.lastIndex = m.index + 1; if (out.length > 1000) break; }
      }
      return json(res, 200, { count: out.length, matches: out, mode });
    }
    // default: single match
    const m = text.match(re);
    if (!m) return json(res, 200, { match: null, mode });
    return json(res, 200, { match: m[0], index: m.index, groups: m.slice(1), named_groups: m.groups || null, mode });
  } catch (e) { return json(res, 400, { error: e.message }); }
}
module.exports = { routeRegex };
